import { Prisma } from '../../generated/prisma/client';

// Forgiving search text: people type Arabic in many ways (أ/إ/آ/ا, ة/ه,
// ى/ي, with or without tashkeel, Persian ی/ک from some keyboards), so both
// the search words and the stored names are folded to one plain form
// before comparing. English is just lower-cased.
const FROM = 'أإآٱىةؤئیک';
const TO = 'اااايهوييك';
// Tashkeel (fatha, damma, kasra, tanween, shadda, sukun, superscript alef)
// and the kashida stretch "ـ".
const MARKS = /[ً-ْٰـ]/g;
const MARKS_SQL = '[ً-ْٰـ]';

export function foldSearchText(text: string): string {
  let out = text.toLowerCase().replace(MARKS, '');
  for (let i = 0; i < FROM.length; i++) out = out.split(FROM[i]).join(TO[i]);
  return out.replace(/\s+/g, ' ').trim();
}

// The same folding inside Postgres, for a column.
export function foldSql(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(regexp_replace(lower(${column}), ${MARKS_SQL}, '', 'g'), ${FROM}, ${TO})`;
}

// "%words%" for LIKE, with the user's own % and _ taken literally.
export function containsPattern(folded: string): string {
  return `%${folded.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
