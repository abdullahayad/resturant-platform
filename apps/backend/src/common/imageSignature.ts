// Checks the file's actual bytes against known image format signatures,
// rather than trusting its claimed extension or Content-Type - both of
// those come straight from the uploader and are trivial to fake (rename
// anything.exe to anything.jpg). A real JPEG/PNG/GIF/WEBP always starts
// with these exact bytes; nothing else does.
export function isRealImage(buffer: Buffer): boolean {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // JPEG
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return true; // PNG
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header === 'GIF87a' || header === 'GIF89a') return true; // GIF
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true; // WEBP
  }
  return false;
}
