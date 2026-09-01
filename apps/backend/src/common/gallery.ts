// Single source of truth for GalleryAlbum's values, mirroring
// prisma/schema.prisma's GalleryAlbum enum. New albums should be added here
// once — CREATABLE_ALBUMS then requires an explicit, conscious decision
// about whether the restaurant can create photos in it directly (REVIEW is
// deliberately excluded: those photos only ever come from a customer's
// review submission, see reviews.service.ts).
export const GALLERY_ALBUMS = ['FOOD', 'MENU', 'AMBIENCE', 'REVIEW'] as const;
export type GalleryAlbumValue = (typeof GALLERY_ALBUMS)[number];

export const CREATABLE_GALLERY_ALBUMS = GALLERY_ALBUMS.filter((a) => a !== 'REVIEW');
export type CreatableGalleryAlbumValue = Exclude<GalleryAlbumValue, 'REVIEW'>;
