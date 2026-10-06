import {
  computeDiscountedPrice,
  isPromotionLiveNow,
  promotionLiveStatus,
  type PromotionForPricing,
  type PromotionSchedule,
  type PromotionScheduleState,
} from './promotion-pricing';

describe('isPromotionLiveNow', () => {
  const recurring = (overrides: Partial<PromotionSchedule> = {}): PromotionSchedule => ({
    isRecurring: true,
    validFrom: null,
    validUntil: null,
    recurringDayOfWeek: 5, // Friday
    startTime: null,
    endTime: null,
    ...overrides,
  });

  it('is live all day on a recurring promo with no time window, on the matching weekday', () => {
    const friday = new Date(2026, 8, 18, 3, 0); // Sep 18 2026 is a Friday
    expect(isPromotionLiveNow(recurring(), friday)).toBe(true);
  });

  it('is not live on a different weekday', () => {
    const saturday = new Date(2026, 8, 19, 12, 0);
    expect(isPromotionLiveNow(recurring(), saturday)).toBe(false);
  });

  it('respects a start/end time window on the matching weekday', () => {
    const inWindow = recurring({ startTime: '17:00', endTime: '19:00' });
    expect(isPromotionLiveNow(inWindow, new Date(2026, 8, 18, 18, 0))).toBe(true);
    expect(isPromotionLiveNow(inWindow, new Date(2026, 8, 18, 20, 0))).toBe(false);
  });

  it('checks a one-off promo against its date range instead of weekday/time', () => {
    const oneOff: PromotionSchedule = {
      isRecurring: false,
      validFrom: new Date('2026-09-01T00:00:00.000Z'),
      validUntil: new Date('2026-09-30T23:59:59.000Z'),
      recurringDayOfWeek: null,
      startTime: null,
      endTime: null,
    };
    expect(isPromotionLiveNow(oneOff, new Date('2026-09-15T12:00:00.000Z'))).toBe(true);
    expect(isPromotionLiveNow(oneOff, new Date('2026-10-01T12:00:00.000Z'))).toBe(false);
  });
});

describe('promotionLiveStatus', () => {
  const oneOff = (overrides: Partial<PromotionScheduleState> = {}): PromotionScheduleState => ({
    isRecurring: false,
    validFrom: new Date('2026-09-10T00:00:00.000Z'),
    validUntil: new Date('2026-09-20T00:00:00.000Z'),
    recurringDayOfWeek: null,
    startTime: null,
    endTime: null,
    isActive: true,
    status: 'APPROVED',
    ...overrides,
  });

  it('is OFF when the restaurant has turned it off, regardless of dates', () => {
    expect(promotionLiveStatus(oneOff({ isActive: false }), new Date('2026-09-15T00:00:00.000Z'))).toBe('OFF');
  });

  it('is OFF when an admin has rejected it, regardless of dates', () => {
    expect(promotionLiveStatus(oneOff({ status: 'REJECTED' }), new Date('2026-09-15T00:00:00.000Z'))).toBe('OFF');
  });

  it('is SCHEDULED before validFrom', () => {
    expect(promotionLiveStatus(oneOff(), new Date('2026-09-01T00:00:00.000Z'))).toBe('SCHEDULED');
  });

  it('is LIVE between validFrom and validUntil', () => {
    expect(promotionLiveStatus(oneOff(), new Date('2026-09-15T00:00:00.000Z'))).toBe('LIVE');
  });

  it('is EXPIRED after validUntil', () => {
    expect(promotionLiveStatus(oneOff(), new Date('2026-09-25T00:00:00.000Z'))).toBe('EXPIRED');
  });

  it('is RECURRING_LIVE on the matching weekday, RECURRING_WAITING otherwise', () => {
    const recurring: PromotionScheduleState = {
      isRecurring: true,
      validFrom: null,
      validUntil: null,
      recurringDayOfWeek: 5, // Friday
      startTime: null,
      endTime: null,
      isActive: true,
      status: 'APPROVED',
    };
    const friday = new Date(2026, 8, 18, 12, 0);
    const saturday = new Date(2026, 8, 19, 12, 0);
    expect(promotionLiveStatus(recurring, friday)).toBe('RECURRING_LIVE');
    expect(promotionLiveStatus(recurring, saturday)).toBe('RECURRING_WAITING');
  });
});

describe('computeDiscountedPrice', () => {
  it('returns null when no promotion applies to this dish', () => {
    const promos: PromotionForPricing[] = [
      { scope: 'SPECIFIC_DISHES', discountType: 'PERCENTAGE', discountValue: 10, dishes: [{ dishId: 'other' }] },
    ];
    expect(computeDiscountedPrice(10000, promos, 'd1')).toBeNull();
  });

  it('applies a whole-menu percentage discount to any dish', () => {
    const promos: PromotionForPricing[] = [
      { scope: 'WHOLE_MENU', discountType: 'PERCENTAGE', discountValue: 20, dishes: [] },
    ];
    expect(computeDiscountedPrice(10000, promos, 'd1')).toBe(8000);
  });

  it('applies a fixed-amount discount, clamped at 0 rather than going negative', () => {
    const promos: PromotionForPricing[] = [
      { scope: 'WHOLE_MENU', discountType: 'FIXED_AMOUNT', discountValue: 15000, dishes: [] },
    ];
    expect(computeDiscountedPrice(10000, promos, 'd1')).toBe(0);
  });

  it('picks whichever applicable promotion gives the best (lowest) price', () => {
    const promos: PromotionForPricing[] = [
      { scope: 'WHOLE_MENU', discountType: 'PERCENTAGE', discountValue: 10, dishes: [] }, // -> 9000
      { scope: 'SPECIFIC_DISHES', discountType: 'FIXED_AMOUNT', discountValue: 2000, dishes: [{ dishId: 'd1' }] }, // -> 8000
    ];
    expect(computeDiscountedPrice(10000, promos, 'd1')).toBe(8000);
  });
});
