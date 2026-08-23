/** Corner radius scale — centralizes values that had drifted (14 vs 16) across screens. */
export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
} as const;

/** Shadow styles that include Android's `elevation` — the platform-specific field every existing
 * shadow in this app was missing, which meant `shadowColor`/`shadowOffset`/`shadowOpacity`/
 * `shadowRadius` (iOS-only) rendered nothing at all on a real Android device. */
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 2,
} as const;

export const raisedShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 6,
} as const;
