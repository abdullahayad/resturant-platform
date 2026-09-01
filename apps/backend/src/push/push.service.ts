import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Push text is always sent in English regardless of each device's app
// language — the backend has no record of which language a given device
// has selected (that preference lives only in the app's local storage).
@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  // Fire-and-forget by convention at call sites — a push delivery failure
  // should never fail the request that triggered it, and there's nothing
  // useful to surface back to the caller if delivery fails.
  async sendToRestaurants(restaurantIds: string[], title: string, body: string, data?: Record<string, string>) {
    if (restaurantIds.length === 0) return;
    const tokens = await this.prisma.db.restaurantPushToken.findMany({
      where: { restaurantId: { in: restaurantIds } },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({ to: t.token, title, body, sound: 'default', data }));
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      }).catch(() => {});
    }
  }
}
