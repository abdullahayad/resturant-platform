import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  // Resend's shared sandbox sender — works with zero setup, but can only
  // deliver to the email address on the Resend account itself until a real
  // domain is verified. Fine for early testing with a small known group;
  // switch RESEND_FROM_EMAIL to an address on a verified domain to send to
  // arbitrary restaurant owners.
  private readonly from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  constructor() {
    // The sandbox sender can only deliver to the email on the Resend
    // account itself - every other recipient's send silently returns
    // false, which callers like forgotPassword() intentionally don't
    // surface to the client (anti-enumeration). Without this, a
    // never-configured RESEND_FROM_EMAIL means password reset is
    // completely broken for real users with zero visible signal anywhere
    // except this warning at startup (see security review).
    if (this.from === 'onboarding@resend.dev') {
      this.logger.warn(
        'RESEND_FROM_EMAIL is not set - using Resend\'s sandbox sender, which can only deliver to the email on the Resend account itself. Password-reset and other transactional emails will silently fail to reach real users until this is set to a verified-domain address.',
      );
    }
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY is not set — skipping email send.');
      return false;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });
      if (!res.ok) {
        this.logger.error(`Resend send failed: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Resend send threw: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }
}
