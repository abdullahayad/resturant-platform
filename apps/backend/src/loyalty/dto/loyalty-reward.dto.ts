import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class GrantLoyaltyRewardDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  guestPhone: string;

  @IsUUID()
  tierId: string;
}
