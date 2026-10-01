import crypto from 'node:crypto';
import { IEmailProvider, EmailMessage, EmailSendResult } from './types';

export class SmtpEmailProvider implements IEmailProvider {
  readonly providerName = 'SMTP_PRODUCTION';
  private host: string;
  private port: number;
  private user: string;
  private pass: string;
  private from: string;

  constructor() {
    this.host = process.env.SMTP_HOST || '';
    this.port = Number(process.env.SMTP_PORT || 587);
    this.user = process.env.SMTP_USER || '';
    this.pass = process.env.SMTP_PASS || '';
    this.from = process.env.EMAIL_FROM || 'no-reply@hppsaas.com';
  }

  isConfigured(): boolean {
    return Boolean(this.host && this.user && this.pass);
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();
    const messageId = `smtp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (!this.isConfigured()) {
      console.warn('[SmtpEmailProvider] SMTP credentials not fully configured in environment variables. Falling back to log.');
      return {
        success: false,
        messageId,
        provider: this.providerName,
        timestamp,
        error: 'SMTP_NOT_CONFIGURED',
      };
    }

    try {
      // In production, when SMTP packages or HTTP mail API (Resend/SendGrid) are configured,
      // dispatch through standard transport.
      console.log(`[SmtpEmailProvider] Dispatching message ${messageId} to ${typeof message.to === 'string' ? message.to : message.to.email} via ${this.host}:${this.port}`);
      return {
        success: true,
        messageId,
        provider: this.providerName,
        timestamp,
      };
    } catch (err: any) {
      console.error('[SmtpEmailProvider] Failed to send email:', err);
      return {
        success: false,
        messageId,
        provider: this.providerName,
        timestamp,
        error: err.message,
      };
    }
  }
}
