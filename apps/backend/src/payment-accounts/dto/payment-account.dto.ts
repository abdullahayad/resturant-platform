import { IsString, MaxLength, MinLength } from 'class-validator';

export const PAYMENT_GATEWAYS = ['zaincash', 'qicard'] as const;
export type PaymentGatewayId = (typeof PAYMENT_GATEWAYS)[number];

export class ConnectPaymentGatewayDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  merchantId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  secret: string;
}
