// Same forgiving comparison as the server's search (backend
// discover/search-text.ts): أ/إ/آ = ا, ة = ه, ى = ي, no tashkeel.
const FROM = 'أإآٱىةؤئیک';
const TO = 'اااايهوييك';
const MARKS = /[ً-ْٰـ]/g;

export function foldSearchText(text: string): string {
  let out = text.toLowerCase().replace(MARKS, '');
  for (let i = 0; i < FROM.length; i++) out = out.split(FROM[i]).join(TO[i]);
  return out.replace(/\s+/g, ' ').trim();
}
