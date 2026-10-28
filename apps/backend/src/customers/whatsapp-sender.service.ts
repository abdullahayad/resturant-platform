import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Sends the 6-digit login code through the WhatsApp Business (Cloud) API,
// as an approved "authentication" template with a copy-code button.
// Settings (Render environment):
//   WHATSAPP_ACCESS_TOKEN     - a permanent system-user token from Meta
//   WHATSAPP_PHONE_NUMBER_ID  - the sending number's id in WhatsApp Manager
//   WHATSAPP_OTP_TEMPLATE     - the approved template's name (default "login_code")
//   WHATSAPP_OTP_LANGUAGE     - its language code (default "ar")
// Until those are set, local development prints the code to the server log
// instead, and the live server refuses politely (no code is ever lost
// silently).
@Injectable()
export class WhatsAppSenderService {
  private readonly logger = new Logger(WhatsAppSenderService.name);

  get isConfigured(): boolean {
    return !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  // phone: local form 07XXXXXXXXX.
  async sendLoginCode(phone: string, code: string): Promise<void> {
    if (!this.isConfigured) {
      if (process.env.RENDER) {
        throw new ServiceUnavailableException('WhatsApp login is not available yet');
      }
      this.logger.warn(`WhatsApp is not configured - login code for ${phone}: ${code}`);
      return;
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `964${phone.slice(1)}`,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_OTP_TEMPLATE ?? 'login_code',
          language: { code: process.env.WHATSAPP_OTP_LANGUAGE ?? 'ar' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Meta's error body never contains the code itself, so it's safe to log.
      this.logger.error(`WhatsApp send failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
      throw new ServiceUnavailableException("We couldn't send the code on WhatsApp. Please try again.");
    }
  }
}
