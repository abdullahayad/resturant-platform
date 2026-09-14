import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Rows per page across every paginated list in the app — one shared
// constant so admin tables and partner-app infinite-scroll lists behave
// consistently, and so it's a one-line change to retune later.
export const PAGE_SIZE = 20;

// Every paginated list's query DTO extends this for a consistent "?page="
// param (1-indexed). class-validator's global ValidationPipe has
// forbidNonWhitelisted on, so `page` has to be declared on each DTO that
// wants to accept it rather than assumed to work everywhere.
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Turns a "?page=" value into the skip/take a Prisma findMany needs, plus
// the page number to echo back in the response. Defaults/clamps to 1 so an
// omitted or invalid page never turns into a negative skip.
export function pageOffset(page?: number): { page: number; skip: number; take: number } {
  const p = page && page > 0 ? page : 1;
  return { page: p, skip: (p - 1) * PAGE_SIZE, take: PAGE_SIZE };
}
