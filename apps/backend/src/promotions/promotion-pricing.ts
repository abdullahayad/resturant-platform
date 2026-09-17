// Whether a customer would see this promotion's discount applied right
// now - separate from status/isActive (those just gate whether it's live
// at all), this is the actual schedule check: a one-off date range, or a
// recurring day-of-week with an optional time-of-day window (no
// start/end time means "all day", matching how it's created).
export interface PromotionSchedule {
  isRecurring: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  recurringDayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
}

export function isPromotionLiveNow(promo: PromotionSchedule, now: Date): boolean {
  if (promo.isRecurring) {
    if (promo.recurringDayOfWeek == null || now.getDay() !== promo.recurringDayOfWeek) return false;
    if (!promo.startTime || !promo.endTime) return true;
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return current >= promo.startTime && current <= promo.endTime;
  }
  if (!promo.validFrom || !promo.validUntil) return false;
  return now >= promo.validFrom && now <= promo.validUntil;
}

export interface PromotionForPricing {
  scope: 'WHOLE_MENU' | 'SPECIFIC_DISHES';
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number | string;
  dishes: { dishId: string }[];
}

// Picks whichever currently-live promotion gives the customer the best
// price for this specific dish, when more than one applies (e.g. a
// whole-menu promo and a dish-specific one overlapping) - never below 0.
export function computeDiscountedPrice(originalPrice: number, promotions: PromotionForPricing[], dishId: string): number | null {
  const applicable = promotions.filter((p) => p.scope === 'WHOLE_MENU' || p.dishes.some((d) => d.dishId === dishId));
  if (applicable.length === 0) return null;

  const candidates = applicable.map((p) => {
    const raw =
      p.discountType === 'PERCENTAGE'
        ? originalPrice * (1 - Number(p.discountValue) / 100)
        : originalPrice - Number(p.discountValue);
    return Math.max(0, Math.round(raw * 100) / 100);
  });
  return Math.min(...candidates);
}
