export interface PartnerJwtPayload {
  sub: string; // restaurant id — same for the owner and every staff login
  type: 'partner';
  restaurantStatus: string;
  tokenVersion: number;
  // Present only for a staff login (absent = this is the restaurant owner).
  staffId?: string;
  staffRole?: 'MANAGER' | 'MENU_EDITOR';
  // Present only for a token minted via "Manage as this restaurant" (see
  // RestaurantsService.createAdminSupportSession) - the admin user id that
  // started the session. Every route behaves exactly as an owner login
  // would; this field exists purely so it can be surfaced for transparency,
  // not to change any authorization decision.
  impersonatedBy?: string;
}

export interface AdminJwtPayload {
  sub: string;
  type: 'admin';
  adminRole: string;
  tokenVersion: number;
}

export type AppJwtPayload = PartnerJwtPayload | AdminJwtPayload;
