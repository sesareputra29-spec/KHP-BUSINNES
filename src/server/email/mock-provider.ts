import crypto from 'node:crypto';
import { IEmailProvider, EmailMessage, EmailSendResult } from './types';

export class MockEmailProvider implements IEmailProvider {
  readonly providerName = 'MOCK_DEV_EMAIL';
  private outbox: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const recipient = typeof message.to === 'string'
      ? message.to
      : `${message.to.name ? message.to.name + ' ' : ''}<${message.to.email}>`;

    // Save to in-memory outbox (rolling buffer max 50)
    this.outbox.unshift(message);
    if (this.outbox.length > 50) {
      this.outbox.pop();
    }

    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_EMAIL) {
      console.log(`\n======================================================`);
      console.log(`[Email Dispatcher] Mock Email Sent Successfully`);
      console.log(`To:      ${recipient}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Tag:     ${message.tag || 'general'}`);
      console.log(`Time:    ${timestamp}`);
      console.log(`Snippet: ${message.text.substring(0, 100).replace(/\n/g, ' ')}...`);
      console.log(`======================================================\n`);
    }

    return {
      success: true,
      messageId,
      provider: this.providerName,
      timestamp,
    };
  }

  getOutbox(): EmailMessage[] {
    return [...this.outbox];
  }

  clearOutbox(): void {
    this.outbox = [];
  }
}
