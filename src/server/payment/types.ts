export type PaymentMethod =
  | 'QRIS'
  | 'VIRTUAL_ACCOUNT'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'E_WALLET';

export type PaymentTransactionStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface CreatePaymentRequest {
  businessId: string;
  businessName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  planCode: string;
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentMethod: PaymentMethod;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreatePaymentResponse {
  transactionId: string;
  provider: string;
  providerTxId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentTransactionStatus;
  paymentUrl?: string;
  qrCodeData?: string;
  virtualAccount?: string;
  expiresAt: string;
  createdAt: string;
}

export interface WebhookEventPayload {
  eventId: string;
  provider: string;
  invoiceNumber: string;
  providerTxId: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  paymentMethod: PaymentMethod;
  paidAt?: string;
  rawPayload: any;
}

export interface IPaymentGatewayProvider {
  readonly providerName: string;

  /**
   * Initializes a payment session on the gateway
   */
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  /**
   * Validates webhook signature using provider secret
   */
  verifySignature(headers: Record<string, any>, body: any): boolean;

  /**
   * Parses gateway-specific webhook payload into normalized format
   */
  parseWebhook(headers: Record<string, any>, body: any): WebhookEventPayload;

  /**
   * Directly verifies transaction status with the payment gateway server
   */
  checkTransactionStatus(providerTxId: string): Promise<PaymentTransactionStatus>;
}
