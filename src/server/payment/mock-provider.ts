import crypto from 'node:crypto';
import {
  IPaymentGatewayProvider,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentTransactionStatus,
  WebhookEventPayload,
  PaymentMethod,
} from './types';

export class MockPaymentGatewayProvider implements IPaymentGatewayProvider {
  readonly providerName = 'MOCK_GATEWAY';
  private webhookSecret: string;

  constructor(secret?: string) {
    this.webhookSecret = secret || process.env.PAYMENT_WEBHOOK_SECRET || 'hpp_saas_webhook_secret_key_2026';
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const providerTxId = `mock_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const transactionId = `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    const now = new Date().toISOString();

    let qrCodeData: string | undefined;
    let virtualAccount: string | undefined;
    let paymentUrl: string | undefined;

    if (request.paymentMethod === 'QRIS') {
      qrCodeData = `00020101021226580014ID.LINKAJA.WWW01189360091100223126830215${request.invoiceNumber}520459995303360540${request.amount}5802ID5918${request.businessName.substring(0, 18)}6007JAKARTA6304`;
      paymentUrl = `/checkout/mock-pay?tx=${providerTxId}&inv=${request.invoiceNumber}&method=QRIS`;
    } else if (request.paymentMethod === 'VIRTUAL_ACCOUNT' || request.paymentMethod === 'BANK_TRANSFER') {
      const bankCode = '8808';
      const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
      virtualAccount = `${bankCode}${randomSuffix}`;
      paymentUrl = `/checkout/mock-pay?tx=${providerTxId}&inv=${request.invoiceNumber}&method=VA&va=${virtualAccount}`;
    } else {
      paymentUrl = `/checkout/mock-pay?tx=${providerTxId}&inv=${request.invoiceNumber}&method=${request.paymentMethod}`;
    }

    return {
      transactionId,
      provider: this.providerName,
      providerTxId,
      invoiceNumber: request.invoiceNumber,
      amount: request.amount,
      currency: request.currency,
      paymentMethod: request.paymentMethod,
      status: 'PENDING',
      paymentUrl,
      qrCodeData,
      virtualAccount,
      expiresAt,
      createdAt: now,
    };
  }

  /**
   * Generates a valid HMAC SHA-256 signature for a payload (used for testing or gateway callbacks)
   */
  generateSignature(payload: string | object): string {
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', this.webhookSecret).update(bodyStr).digest('hex');
  }

  verifySignature(headers: Record<string, any>, body: any): boolean {
    const signature = headers['x-webhook-signature'] || headers['x-callback-signature'] || headers['x-signature'];
    if (!signature) {
      return false;
    }

    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(bodyStr).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhook(headers: Record<string, any>, body: any): WebhookEventPayload {
    return {
      eventId: body.event_id || body.id || `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      provider: this.providerName,
      invoiceNumber: body.invoice_number || body.external_id || body.order_id,
      providerTxId: body.provider_tx_id || body.transaction_id || `mock_tx_${Date.now()}`,
      amount: Number(body.amount || 0),
      currency: body.currency || 'IDR',
      status: (body.status || 'PAID').toUpperCase() as PaymentTransactionStatus,
      paymentMethod: (body.payment_method || 'QRIS').toUpperCase() as PaymentMethod,
      paidAt: body.paid_at || new Date().toISOString(),
      rawPayload: body,
    };
  }

  async checkTransactionStatus(providerTxId: string): Promise<PaymentTransactionStatus> {
    // In mock provider, query is assumed successful or pending
    return 'PAID';
  }
}
