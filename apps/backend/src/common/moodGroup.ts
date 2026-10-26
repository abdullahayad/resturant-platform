// Single source of truth for the MoodGroup enum's values, mirroring
// prisma/schema.prisma's MoodGroup enum.
export const MOOD_GROUPS = ['CLASSIC', 'PEOPLE', 'PLACE', 'TIME', 'FOOD', 'SEASONAL'] as const;
export type MoodGroupValue = (typeof MOOD_GROUPS)[number];
