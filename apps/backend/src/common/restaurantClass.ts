// Single source of truth for the RestaurantClass enum's values, mirroring
// prisma/schema.prisma's RestaurantClass enum - see that enum's own comment
// for what this represents (an admin-assigned price/quality tier).
export const RESTAURANT_CLASSES = ['LUXURY', 'UPSCALE', 'MODERATE', 'BUDGET'] as const;
export type RestaurantClassValue = (typeof RESTAURANT_CLASSES)[number];
