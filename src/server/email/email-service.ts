import { IEmailProvider, EmailMessage, EmailSendResult } from './types';
import { MockEmailProvider } from './mock-provider';
import { SmtpEmailProvider } from './smtp-provider';
import {
  renderEmailVerification,
  EmailVerificationParams,
  renderForgotPassword,
  ForgotPasswordParams,
  renderPasswordResetSuccess,
  PasswordResetSuccessParams,
  renderTeamInvitation,
  TeamInvitationParams,
  renderPaymentConfirmation,
  PaymentConfirmationParams,
  renderInvoiceNotification,
  InvoiceNotificationParams,
  renderSubscriptionReminder,
  SubscriptionReminderParams,
} from './templates';

export class EmailService {
  private provider: IEmailProvider;
  private defaultFrom: string;

  constructor(provider?: IEmailProvider) {
    if (provider) {
      this.provider = provider;
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.provider = new SmtpEmailProvider();
    } else {
      this.provider = new MockEmailProvider();
    }
    this.defaultFrom = process.env.EMAIL_FROM || 'Kalkulator HPP SaaS <no-reply@hppsaas.com>';
  }

  setProvider(provider: IEmailProvider) {
    this.provider = provider;
  }

  getProviderName(): string {
    return this.provider.providerName;
  }

  getOutbox(): EmailMessage[] {
    return this.provider.getOutbox ? this.provider.getOutbox() : [];
  }

  clearOutbox(): void {
    if (this.provider.clearOutbox) {
      this.provider.clearOutbox();
    }
  }

  /**
   * Safe Dispatch Wrapper:
   * Guarantees email delivery failures NEVER break main business transactions
   */
  private async safeSend(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const fullMessage: EmailMessage = {
        from: this.defaultFrom,
        ...message,
      };
      return await this.provider.sendEmail(fullMessage);
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${typeof message.to === 'string' ? message.to : message.to.email}:`, err.message);
      return {
        success: false,
        messageId: 'err_fallback',
        provider: this.provider.providerName,
        timestamp: new Date().toISOString(),
        error: err.message || 'Unknown email dispatch error',
      };
    }
  }

  // 1. Email Verification
  async sendEmailVerification(to: string, params: EmailVerificationParams): Promise<EmailSendResult> {
    const rendered = renderEmailVerification(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'email-verification',
    });
  }

  // 2. Forgot Password
  async sendForgotPassword(to: string, params: ForgotPasswordParams): Promise<EmailSendResult> {
    const rendered = renderForgotPassword(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'forgot-password',
    });
  }

  // 3. Password Reset Success Confirmation
  async sendPasswordResetSuccess(to: string, params: PasswordResetSuccessParams): Promise<EmailSendResult> {
    const rendered = renderPasswordResetSuccess(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'password-reset-success',
    });
  }

  // 4. Team Member Invitation
  async sendTeamInvitation(to: string, params: TeamInvitationParams): Promise<EmailSendResult> {
    const rendered = renderTeamInvitation(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'team-invitation',
    });
  }

  // 5. Payment Confirmation
  async sendPaymentConfirmation(to: string, params: PaymentConfirmationParams): Promise<EmailSendResult> {
    const rendered = renderPaymentConfirmation(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'payment-confirmation',
    });
  }

  // 6. Invoice Notification
  async sendInvoiceNotification(to: string, params: InvoiceNotificationParams): Promise<EmailSendResult> {
    const rendered = renderInvoiceNotification(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'invoice-notification',
    });
  }

  // 7. Subscription / Trial Reminder
  async sendSubscriptionReminder(to: string, params: SubscriptionReminderParams): Promise<EmailSendResult> {
    const rendered = renderSubscriptionReminder(params);
    return this.safeSend({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'subscription-reminder',
    });
  }
}

export const emailService = new EmailService();
