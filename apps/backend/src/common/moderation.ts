// Single source of truth for the ModerationStatus enum's values, mirroring
// prisma/schema.prisma's ModerationStatus enum. Previously duplicated as a
// literal array in dish.dto.ts, event.dto.ts, gallery-photo.dto.ts, and
// review.dto.ts — a value added to one and not the others would silently
// desync validation from what the database actually accepts.
export const MODERATION_STATUSES = ['VISIBLE', 'FLAGGED', 'HIDDEN'] as const;
export type ModerationStatusValue = (typeof MODERATION_STATUSES)[number];
