import { IsIn, ValidateIf } from 'class-validator';
import { RESTAURANT_CLASSES, type RestaurantClassValue } from '../../common/restaurantClass';

// restaurantClass must be present in the body, as either null (clears the
// classification) or one of the 4 fixed values (sets it) - admin-only, same
// reasoning as SetChainDto: a restaurant judging its own price/quality tier
// would defeat the point of an independent rating.
export class SetClassDto {
  @ValidateIf((dto: SetClassDto) => dto.restaurantClass !== null)
  @IsIn(RESTAURANT_CLASSES)
  restaurantClass: RestaurantClassValue | null;
}
