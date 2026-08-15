export interface PartnerJwtPayload {
  sub: string;
  type: 'partner';
  restaurantStatus: string;
}

export interface AdminJwtPayload {
  sub: string;
  type: 'admin';
  adminRole: string;
}

export type AppJwtPayload = PartnerJwtPayload | AdminJwtPayload;
