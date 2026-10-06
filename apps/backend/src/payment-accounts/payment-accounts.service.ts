import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret } from '../common/secretEncryption';
import { PAYMENT_GATEWAYS, type ConnectPaymentGatewayDto, type PaymentGatewayId } from './dto/payment-account.dto';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

const gatewayColumns = {
  zaincash: { merchantId: 'zainCashMerchantId', secret: 'zainCashSecretEncrypted', connectedAt: 'zainCashConnectedAt' },
  qicard: { merchantId: 'qiCardMerchantId', secret: 'qiCardSecretEncrypted', connectedAt: 'qiCardConnectedAt' },
} as const;

const GATEWAY_LABELS: Record<string, string> = { zaincash: 'ZainCash', qicard: 'Qi Card' };

// Shows "connected" state without ever revealing the merchant id in full -
// it isn't the secret, but there's no reason to echo it back verbatim either.
function maskMerchantId(merchantId: string): string {
  const visible = merchantId.slice(-4);
  return `••••${visible}`;
}

@Injectable()
export class PaymentAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  private assertValidGateway(gateway: string): asserts gateway is PaymentGatewayId {
    if (!PAYMENT_GATEWAYS.includes(gateway as PaymentGatewayId)) {
      throw new BadRequestException('Unknown payment gateway');
    }
  }

  async get(restaurantId: string) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        zainCashMerchantId: true,
        zainCashConnectedAt: true,
        qiCardMerchantId: true,
        qiCardConnectedAt: true,
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return {
      zaincash:
        restaurant.zainCashConnectedAt && restaurant.zainCashMerchantId
          ? { merchantId: maskMerchantId(restaurant.zainCashMerchantId), connectedAt: restaurant.zainCashConnectedAt }
          : null,
      qicard:
        restaurant.qiCardConnectedAt && restaurant.qiCardMerchantId
          ? { merchantId: maskMerchantId(restaurant.qiCardMerchantId), connectedAt: restaurant.qiCardConnectedAt }
          : null,
    };
  }

  async connect(restaurantId: string, gateway: string, dto: ConnectPaymentGatewayDto, user: PartnerJwtPayload) {
    this.assertValidGateway(gateway);
    const columns = gatewayColumns[gateway];

    await this.prisma.db.restaurant.update({
      where: { id: restaurantId },
      data: {
        [columns.merchantId]: dto.merchantId,
        [columns.secret]: encryptSecret(dto.secret),
        [columns.connectedAt]: new Date(),
      },
    });
    // Never log merchantId/secret values - just the fact that a connection
    // was made, same reasoning as never logging a password change's values.
    await this.activityLog.log({
      restaurantId,
      section: 'settings',
      summary: `Connected ${GATEWAY_LABELS[gateway] ?? gateway} payment account`,
      user,
    });

    return this.get(restaurantId);
  }

  async disconnect(restaurantId: string, gateway: string, user: PartnerJwtPayload) {
    this.assertValidGateway(gateway);
    const columns = gatewayColumns[gateway];

    await this.prisma.db.restaurant.update({
      where: { id: restaurantId },
      data: {
        [columns.merchantId]: null,
        [columns.secret]: null,
        [columns.connectedAt]: null,
      },
    });
    await this.activityLog.log({
      restaurantId,
      section: 'settings',
      summary: `Disconnected ${GATEWAY_LABELS[gateway] ?? gateway} payment account`,
      user,
    });

    return this.get(restaurantId);
  }
}
