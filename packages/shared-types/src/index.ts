// Types shared between the admin portal and backend that don't warrant
// importing the full Prisma client into a frontend bundle.

export type RestaurantStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type AdminRole = 'SUPER_ADMIN' | 'MODERATOR';

export type StaffRole = 'OWNER' | 'MANAGER' | 'MENU_EDITOR';

export type ModerationStatus = 'VISIBLE' | 'FLAGGED' | 'HIDDEN';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface BilingualText {
  en: string;
  ar: string;
}
