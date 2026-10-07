import { isRealImage } from './imageSignature';

describe('isRealImage', () => {
  it('accepts a real JPEG signature', () => {
    expect(isRealImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))).toBe(true);
  });

  it('accepts a real PNG signature', () => {
    expect(isRealImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe(true);
  });

  it('accepts a real GIF signature', () => {
    expect(isRealImage(Buffer.from('GIF89a' + 'rest', 'ascii'))).toBe(true);
  });

  it('accepts a real WEBP signature', () => {
    const buf = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP', 'ascii')]);
    expect(isRealImage(buf)).toBe(true);
  });

  it("rejects a file renamed to look like an image but isn't one", () => {
    // e.g. a text file or executable with a .jpg extension slapped on it
    expect(isRealImage(Buffer.from('MZ\x90\x00this is not an image', 'ascii'))).toBe(false);
  });

  it('rejects an empty buffer', () => {
    expect(isRealImage(Buffer.alloc(0))).toBe(false);
  });
});
