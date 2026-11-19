import { containsPattern, foldSearchText } from './search-text';

describe('foldSearchText', () => {
  it('treats Arabic spelling variants as the same word', () => {
    expect(foldSearchText('أكلة')).toBe(foldSearchText('اكله'));
    expect(foldSearchText('إفطار')).toBe('افطار');
    expect(foldSearchText('آيس كريم')).toBe('ايس كريم');
    expect(foldSearchText('مشوى')).toBe(foldSearchText('مشوي'));
    expect(foldSearchText('مؤمن')).toBe('مومن');
  });

  it('ignores tashkeel, kashida and Persian letters', () => {
    expect(foldSearchText('كَبَاب')).toBe('كباب');
    expect(foldSearchText('كبـــاب')).toBe('كباب');
    expect(foldSearchText('کباب')).toBe('كباب');
    expect(foldSearchText('شاي')).toBe(foldSearchText('شای'));
  });

  it('lower-cases English and tidies spaces', () => {
    expect(foldSearchText('  Grilled   CHICKEN ')).toBe('grilled chicken');
  });
});

describe('containsPattern', () => {
  it("takes the user's % and _ literally", () => {
    expect(containsPattern('50%_off')).toBe(String.raw`%50\%\_off%`);
  });
});
