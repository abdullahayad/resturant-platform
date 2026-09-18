import { IsUUID, ValidateIf } from 'class-validator';

// chainId must be present in the body, as either null (clears the link) or
// a real chain id (sets it) - see RestaurantChain's comment in
// schema.prisma for why this is admin-only.
export class SetChainDto {
  @ValidateIf((dto: SetChainDto) => dto.chainId !== null)
  @IsUUID()
  chainId: string | null;
}
