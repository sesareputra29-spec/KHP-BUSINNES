import crypto from 'node:crypto';
import { dbAdapter, logAdminAudit, isUsingPostgres } from '../db';
import { logAudit } from '../auth';
import { emailService } from '../email/email-service';
import {
  IPaymentGatewayProvider,
  PaymentMethod,
  PaymentTransactionStatus,
  CreatePaymentResponse,
} from './types';
import { MockPaymentGatewayProvider } from './mock-provider';

export interface CheckoutParams {
  businessId: string;
  businessName: string;
  planCode: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentMethod: PaymentMethod;
  actorUserId: string;
  actorUserName: string;
  actorUserRole: string;
  customerEmail?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  code: number;
  idempotent?: boolean;
  error?: string;
  message: string;
  invoiceNumber?: string;
  status?: PaymentTransactionStatus;
}

export class PaymentService {
  private provider: IPaymentGatewayProvider;

  constructor(provider?: IPaymentGatewayProvider) {
    this.provider = provider || new MockPaymentGatewayProvider();
  }

  setProvider(provider: IPaymentGatewayProvider) {
    this.provider = provider;
  }

  getProviderName(): string {
    return this.provider.providerName;
  }

  /**
   * Flow Step 1: Customer initiates checkout.
   * Generates Invoice in PENDING state and creates payment session on gateway.
   */
  async createCheckoutSession(params: CheckoutParams): Promise<{
    invoice: any;
    payment: CreatePaymentResponse;
  }> {
    const planRow = await dbAdapter.queryOne(
      'SELECT * FROM plans WHERE code = ? AND (is_active = 1 OR is_active = TRUE)',
      [params.planCode]
    );
    if (!planRow) {
      throw new Error(`Paket ${params.planCode} tidak ditemukan atau belum aktif.`);
    }

    const isYearly = params.billingCycle.toUpperCase() === 'YEARLY';
    const amount = isYearly ? planRow.price_yearly : planRow.price_monthly;
    const now = new Date();
    const durationDays = isYearly ? 365 : 30;
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const invId = `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const invoiceNumber = `INV-${now.toISOString().substring(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const invoiceObj = {
      id: invId,
      businessId: params.businessId,
      invoiceNumber,
      planId: planRow.id,
      planCode: planRow.code,
      planName: planRow.name,
      amount,
      currency: 'IDR',
      status: 'PENDING',
      billingCycle: isYearly ? 'YEARLY' : 'MONTHLY',
      paymentMethod: params.paymentMethod,
      paidAt: null,
      createdAt: now.toISOString(),
      metadata: {
        durationDays,
        endDate: endDate.toISOString(),
      },
    };

    // 1. Insert initial invoice with PENDING status
    await dbAdapter.execute(`
      INSERT INTO invoices (id, business_id, invoice_number, plan_id, plan_name, amount, currency, status, billing_cycle, payment_method, paid_at, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invId,
      params.businessId,
      invoiceNumber,
      planRow.id,
      planRow.name,
      amount,
      'IDR',
      'PENDING',
      invoiceObj.billingCycle,
      params.paymentMethod,
      null,
      now.toISOString(),
      JSON.stringify(invoiceObj),
    ]);

    // 2. Delegate to payment gateway provider
    const payment = await this.provider.createPayment({
      businessId: params.businessId,
      businessName: params.businessName,
      invoiceId: invId,
      invoiceNumber,
      amount,
      currency: 'IDR',
      planCode: planRow.code,
      planName: planRow.name,
      billingCycle: invoiceObj.billingCycle as 'MONTHLY' | 'YEARLY',
      paymentMethod: params.paymentMethod,
      customerEmail: params.customerEmail,
    });

    // 3. Record payment transaction record in database
    await dbAdapter.execute(`
      INSERT INTO payment_transactions (
        id, business_id, invoice_id, provider, provider_tx_id,
        amount, currency, payment_method, status, payment_url,
        qr_code_data, virtual_account, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payment.transactionId,
      params.businessId,
      invId,
      payment.provider,
      payment.providerTxId,
      payment.amount,
      payment.currency,
      payment.paymentMethod,
      payment.status,
      payment.paymentUrl || null,
      payment.qrCodeData || null,
      payment.virtualAccount || null,
      JSON.stringify({ planCode: planRow.code, billingCycle: invoiceObj.billingCycle }),
      payment.createdAt,
      payment.createdAt,
    ]);

    logAudit(
      params.businessId,
      params.actorUserId,
      params.actorUserName,
      'Checkout Tagihan',
      'Billing',
      `Memulai transaksi pembayaran ${invoiceNumber} (${payment.paymentMethod}) untuk Paket ${planRow.name}.`
    );

    // Non-blocking invoice notification email
    if (params.customerEmail) {
      emailService.sendInvoiceNotification(params.customerEmail, {
        customerName: params.actorUserName,
        invoiceNumber,
        planName: planRow.name,
        amountFormatted: `Rp ${amount.toLocaleString('id-ID')}`,
        dueDate: endDate.toISOString().substring(0, 10),
        paymentUrl: payment.paymentUrl || '/billing',
      }).catch((err) => console.error('[Checkout] Invoice email notification failed silently:', err));
    }

    return {
      invoice: invoiceObj,
      payment,
    };
  }

  /**
   * Flow Steps 4, 5, 6: Payment Gateway sends webhook callback.
   * Performs cryptographic signature validation, strict idempotency check,
   * updates invoice, and activates subscription safely.
   */
  async processWebhook(headers: Record<string, any>, body: any): Promise<WebhookProcessResult> {
    // 1. Cryptographic Signature Validation
    const isSignatureValid = this.provider.verifySignature(headers, body);
    if (!isSignatureValid) {
      console.warn('[PaymentWebhook] Signature verification failed. Rejecting unauthorized callback.');
      return {
        success: false,
        code: 401,
        error: 'INVALID_SIGNATURE',
        message: 'Akses ditolak: Verifikasi signature webhook gagal atau tidak cocok dengan secret key.',
      };
    }

    // 2. Parse gateway payload
    const event = this.provider.parseWebhook(headers, body);

    // 3. Strict Idempotency Check
    const existingEvent = await dbAdapter.queryOne(`
      SELECT id, status, processed_at
      FROM webhook_events
      WHERE provider = ? AND event_id = ?
    `, [event.provider, event.eventId]);

    if (existingEvent) {
      console.log(`[PaymentWebhook] Idempotent hit: Event ${event.eventId} already processed at ${existingEvent.processed_at}. No re-activation.`);
      return {
        success: true,
        code: 200,
        idempotent: true,
        message: 'Event webhook telah berhasil diproses sebelumnya (Idempotent).',
        invoiceNumber: event.invoiceNumber,
        status: existingEvent.status as PaymentTransactionStatus,
      };
    }

    // 4. Record event in webhook_events table for audit and future idempotency
    const now = new Date().toISOString();
    const webhookRecordId = `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await dbAdapter.execute(`
      INSERT INTO webhook_events (id, provider, event_id, event_type, reference_id, status, processed_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      webhookRecordId,
      event.provider,
      event.eventId,
      'PAYMENT_CALLBACK',
      event.invoiceNumber,
      event.status,
      now,
      JSON.stringify(event.rawPayload),
    ]);

    // 5. Server Verification of Invoice
    const invoiceRow = await dbAdapter.queryOne(`
      SELECT *
      FROM invoices
      WHERE invoice_number = ?
    `, [event.invoiceNumber]);

    if (!invoiceRow) {
      console.error(`[PaymentWebhook] Invoice ${event.invoiceNumber} not found in database.`);
      return {
        success: false,
        code: 404,
        error: 'INVOICE_NOT_FOUND',
        message: `Faktur ${event.invoiceNumber} tidak ditemukan dalam sistem.`,
      };
    }

    const businessId = invoiceRow.business_id;

    // 6. Handle PAID / SETTLEMENT
    if (event.status === 'PAID') {
      const alreadyPaid = invoiceRow.status === 'PAID';

      // Update Invoice
      const invoiceData = invoiceRow.data_json ? JSON.parse(invoiceRow.data_json) : {};
      invoiceData.status = 'PAID';
      invoiceData.paidAt = event.paidAt || now;
      invoiceData.paymentReference = event.providerTxId;

      await dbAdapter.execute(`
        UPDATE invoices
        SET status = 'PAID', paid_at = ?, data_json = ?
        WHERE invoice_number = ?
      `, [invoiceData.paidAt, JSON.stringify(invoiceData), event.invoiceNumber]);

      // Update payment_transactions
      await dbAdapter.execute(`
        UPDATE payment_transactions
        SET status = 'PAID', paid_at = ?, updated_at = ?
        WHERE invoice_id = ?
      `, [invoiceData.paidAt, now, invoiceRow.id]);

      // Activate or Extend Subscription IF NOT ALREADY PAID
      if (!alreadyPaid) {
        const isYearly = invoiceRow.billing_cycle === 'YEARLY';
        const durationDays = isYearly ? 365 : 30;
        const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const subId = `sub_${businessId}`;
        const readOnlyVal = isUsingPostgres() ? false : 0;

        await dbAdapter.execute(`
          INSERT INTO subscriptions (
            id, business_id, plan_id, status, billing_cycle,
            start_date, end_date, trial_start, trial_end, is_read_only, payment_reference, notes, created_at, updated_at
          ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            plan_id = excluded.plan_id,
            status = 'ACTIVE',
            billing_cycle = excluded.billing_cycle,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            is_read_only = excluded.is_read_only,
            payment_reference = excluded.payment_reference,
            notes = excluded.notes,
            updated_at = excluded.updated_at
        `, [
          subId,
          businessId,
          invoiceRow.plan_id,
          invoiceRow.billing_cycle,
          now,
          endDate,
          readOnlyVal,
          event.invoiceNumber,
          `Langganan terkonfirmasi via webhook payment gateway (${event.provider} - ${event.paymentMethod})`,
          now,
          now,
        ]);

        // Sync plan code to business table
        const planRow = await dbAdapter.queryOne('SELECT code FROM plans WHERE id = ?', [invoiceRow.plan_id]);
        if (planRow) {
          await dbAdapter.execute('UPDATE businesses SET plan = ? WHERE id = ?', [planRow.code, businessId]);
        }

        logAdminAudit(
          'system_payment_webhook',
          'Payment Gateway Webhook',
          'SYSTEM',
          'WEBHOOK_PAYMENT_SUCCESS',
          'SUBSCRIPTION',
          subId,
          businessId,
          {
            invoiceNumber: event.invoiceNumber,
            amount: event.amount,
            provider: event.provider,
            providerTxId: event.providerTxId,
            paidAt: invoiceData.paidAt,
          }
        );

        logAudit(
          businessId,
          'system',
          'Payment Webhook',
          'Pelunasan Tagihan',
          'Billing',
          `Pembayaran faktur ${event.invoiceNumber} berhasil diverifikasi. Paket aktif hingga ${endDate.substring(0, 10)}.`
        );

        // Non-blocking payment confirmation email
        try {
          const ownerUser = await dbAdapter.queryOne("SELECT name, email FROM users WHERE business_id = ? AND role = 'Manager / Owner'", [businessId]);
          if (ownerUser && ownerUser.email) {
            emailService.sendPaymentConfirmation(ownerUser.email, {
              customerName: ownerUser.name || 'Pelanggan',
              invoiceNumber: event.invoiceNumber,
              planName: invoiceRow.plan_name,
              amountFormatted: `Rp ${event.amount.toLocaleString('id-ID')}`,
              paymentMethod: event.paymentMethod,
              paidAt: invoiceData.paidAt || now,
              endDate: endDate.substring(0, 10),
            }).catch((e) => console.error('[PaymentWebhook] Email dispatch failed silently:', e));
          }
        } catch (e) {
          console.error('[PaymentWebhook] Failed to query user for payment email:', e);
        }
      }
    } else if (event.status === 'FAILED' || event.status === 'EXPIRED') {
      await dbAdapter.execute(`UPDATE invoices SET status = ? WHERE invoice_number = ?`, [event.status, event.invoiceNumber]);
      await dbAdapter.execute(`UPDATE payment_transactions SET status = ?, updated_at = ? WHERE invoice_id = ?`, [event.status, now, invoiceRow.id]);
    }

    return {
      success: true,
      code: 200,
      invoiceNumber: event.invoiceNumber,
      status: event.status,
      message: `Webhook untuk faktur ${event.invoiceNumber} berhasil diproses dengan status: ${event.status}.`,
    };
  }

  /**
   * Helper for local development testing:
   * Generates a signed webhook simulation and feeds it directly into processWebhook.
   */
  async simulatePaymentSettlement(invoiceNumber: string): Promise<WebhookProcessResult> {
    const inv = await dbAdapter.queryOne('SELECT * FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
    if (!inv) {
      return { success: false, code: 404, message: `Faktur ${invoiceNumber} tidak ditemukan.` };
    }

    const mockProvider = this.provider instanceof MockPaymentGatewayProvider
      ? this.provider
      : new MockPaymentGatewayProvider();

    const payload = {
      event_id: `evt_sim_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      invoice_number: invoiceNumber,
      provider_tx_id: `sim_tx_${Date.now()}`,
      amount: inv.amount,
      currency: inv.currency,
      status: 'PAID',
      payment_method: inv.payment_method || 'QRIS',
      paid_at: new Date().toISOString(),
    };

    const signature = mockProvider.generateSignature(payload);
    const headers = {
      'x-webhook-signature': signature,
      'content-type': 'application/json',
    };

    return this.processWebhook(headers, payload);
  }
}

export const paymentService = new PaymentService();
