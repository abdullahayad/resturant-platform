export interface PartnerJwtPayload {
  sub: string; // restaurant id — same for the owner and every staff login
  type: 'partner';
  restaurantStatus: string;
  tokenVersion: number;
  // Present only for a staff login (absent = this is the restaurant owner).
  staffId?: string;
  staffRole?: 'MANAGER' | 'MENU_EDITOR';
}

export interface AdminJwtPayload {
  sub: string;
  type: 'admin';
  adminRole: string;
  tokenVersion: number;
}

export type AppJwtPayload = PartnerJwtPayload | AdminJwtPayload;
