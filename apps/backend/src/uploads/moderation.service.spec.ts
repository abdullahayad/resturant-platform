import { ModerationService, isUnsafe } from './moderation.service';
import type { PredictionType } from 'nsfwjs';

describe('isUnsafe', () => {
  const prediction = (className: string, probability: number): PredictionType =>
    ({ className, probability }) as PredictionType;

  it('flags a high-confidence Porn prediction', () => {
    const predictions = [prediction('Porn', 0.92), prediction('Neutral', 0.05), prediction('Drawing', 0.03)];
    expect(isUnsafe(predictions)).toBe(true);
  });

  it('does not flag when every unsafe category scores below the threshold', () => {
    const predictions = [prediction('Sexy', 0.4), prediction('Neutral', 0.5), prediction('Drawing', 0.1)];
    expect(isUnsafe(predictions)).toBe(false);
  });

  it('takes the highest of the unsafe categories, not their sum', () => {
    // Porn + Hentai + Sexy would sum past the threshold, but no single
    // category is confident on its own - this should not flag.
    const predictions = [prediction('Porn', 0.3), prediction('Hentai', 0.3), prediction('Sexy', 0.3)];
    expect(isUnsafe(predictions)).toBe(false);
  });

  it('ignores safe categories entirely, however high their score', () => {
    const predictions = [prediction('Neutral', 0.99)];
    expect(isUnsafe(predictions)).toBe(false);
  });
});

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(() => {
    service = new ModerationService();
  });

  it('passes through unmoderated formats (e.g. webp) without attempting to decode them', async () => {
    const result = await service.isExplicit(Buffer.from('not a real image'), 'webp');
    expect(result).toBe(false);
  });

  it('fails open (allows the upload through) when the image cannot be decoded', async () => {
    // Garbage bytes claiming to be a jpg - jpeg.decode() will throw.
    const result = await service.isExplicit(Buffer.from([1, 2, 3, 4, 5]), 'jpg');
    expect(result).toBe(false);
  });
});
