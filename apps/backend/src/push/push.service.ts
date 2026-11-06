import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, string>;
}

// Expo's answer for one message, in the same order as the messages sent.
interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

// A push to customers, in both languages - each phone gets the one its app
// was in when it registered (CustomerPushToken.language).
export interface CustomerPushText {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

// Fire-and-forget by convention at call sites — a push delivery failure
// should never fail the request that triggered it, and there's nothing
// useful to surface back to the caller if delivery fails. Still worth
// logging Expo's response though: it silently reports per-token errors
// (bad credentials, DeviceNotRegistered, etc.) inside a 200 response body
// rather than as an HTTP error, so without reading it a delivery failure
// looks identical to a delivery success from this code's point of view.
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Partner app. Push text is always sent in English here — the backend has
  // no record of which language a given restaurant device has selected.
  async sendToRestaurants(restaurantIds: string[], title: string, body: string, data?: Record<string, string>) {
    if (restaurantIds.length === 0) return;
    const tokens = await this.prisma.db.restaurantPushToken.findMany({
      where: { restaurantId: { in: restaurantIds } },
      select: { token: true },
    });
    if (tokens.length === 0) return;
    await this.send(tokens.map((t) => ({ to: t.token, title, body, sound: 'default', data })));
  }

  // Customer app. Returns how many phones it was sent to. Phones that
  // uninstalled the app (Expo: DeviceNotRegistered) are forgotten so they
  // aren't tried again.
  async sendToCustomers(customerIds: string[], text: CustomerPushText, data?: Record<string, string>): Promise<number> {
    if (customerIds.length === 0) return 0;
    const ids = [...new Set(customerIds)];
    // Saved first: the inbox has it even if the phone can't be reached.
    await this.prisma.db.customerNotification.createMany({
      data: ids.map((customerId) => ({
        customerId,
        titleEn: text.titleEn,
        titleAr: text.titleAr,
        bodyEn: text.bodyEn,
        bodyAr: text.bodyAr,
        data,
      })),
    });
    const tokens = await this.prisma.db.customerPushToken.findMany({
      where: { customerId: { in: ids } },
      select: { token: true, language: true },
    });
    if (tokens.length === 0) return 0;
    const messages: ExpoMessage[] = tokens.map((t) => ({
      to: t.token,
      title: t.language === 'en' ? text.titleEn : text.titleAr,
      body: t.language === 'en' ? text.bodyEn : text.bodyAr,
      sound: 'default',
      data,
    }));
    const tickets = await this.send(messages);
    const dead = messages
      .filter((_, i) => tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered')
      .map((m) => m.to);
    if (dead.length) {
      await this.prisma.db.customerPushToken.deleteMany({ where: { token: { in: dead } } }).catch(() => {});
    }
    return tokens.length;
  }

  private async send(messages: ExpoMessage[]): Promise<(ExpoTicket | undefined)[]> {
    const tickets: (ExpoTicket | undefined)[] = [];
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(chunk),
        });
        const result = (await res.json()) as { data?: ExpoTicket[] };
        this.logger.log(`Expo push send (status ${res.status}): ${JSON.stringify(result)}`);
        tickets.push(...(result.data ?? chunk.map(() => undefined)));
      } catch (err) {
        this.logger.error(`Expo push send request failed: ${err instanceof Error ? err.message : String(err)}`);
        tickets.push(...chunk.map(() => undefined));
      }
    }
    return tickets;
  }
}
