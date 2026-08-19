export interface PartnerJwtPayload {
  sub: string;
  type: 'partner';
  restaurantStatus: string;
  tokenVersion: number;
}

export interface AdminJwtPayload {
  sub: string;
  type: 'admin';
  adminRole: string;
  tokenVersion: number;
}

export type AppJwtPayload = PartnerJwtPayload | AdminJwtPayload;
