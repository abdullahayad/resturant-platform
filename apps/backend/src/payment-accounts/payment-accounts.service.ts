import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret } from '../common/secretEncryption';
import { PAYMENT_GATEWAYS, type ConnectPaymentGatewayDto, type PaymentGatewayId } from './dto/payment-account.dto';

const gatewayColumns = {
  zaincash: { merchantId: 'zainCashMerchantId', secret: 'zainCashSecretEncrypted', connectedAt: 'zainCashConnectedAt' },
  qicard: { merchantId: 'qiCardMerchantId', secret: 'qiCardSecretEncrypted', connectedAt: 'qiCardConnectedAt' },
} as const;

// Shows "connected" state without ever revealing the merchant id in full -
// it isn't the secret, but there's no reason to echo it back verbatim either.
function maskMerchantId(merchantId: string): string {
  const visible = merchantId.slice(-4);
  return `••••${visible}`;
}

@Injectable()
export class PaymentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async connect(restaurantId: string, gateway: string, dto: ConnectPaymentGatewayDto) {
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

    return this.get(restaurantId);
  }

  async disconnect(restaurantId: string, gateway: string) {
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

    return this.get(restaurantId);
  }
}
