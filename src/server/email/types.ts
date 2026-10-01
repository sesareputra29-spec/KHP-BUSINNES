export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: string | EmailRecipient;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  tag?: string;
  metadata?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  timestamp: string;
  error?: string;
}

export interface IEmailProvider {
  readonly providerName: string;

  /**
   * Dispatches an email message
   */
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Optional helper to inspect recent outgoing emails in development / testing
   */
  getOutbox?(): EmailMessage[];

  /**
   * Optional helper to clear in-memory outbox
   */
  clearOutbox?(): void;
}
