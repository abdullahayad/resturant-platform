import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import * as nsfwjs from 'nsfwjs';
import type { NSFWJS, PredictionType } from 'nsfwjs';
import { PrismaService } from '../prisma/prisma.service';

// Free, fully local, no account/API key - nsfwjs ships its model weights
// inside the npm package itself (no CDN fetch at inference time), and runs
// on tfjs's plain-JS CPU backend rather than @tensorflow/tfjs-node, which
// needs native compilation that's a common source of deploy failures on a
// host like Render. The tradeoff: slower per-image (a second or so on
// modest hardware, acceptable for an occasional photo upload, not a
// real-time feed) and lower accuracy than a paid cloud API (AWS
// Rekognition/Google Vision) - a reasonable first line of defense, not a
// replacement for the existing human moderation queue.
const UNSAFE_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']);
const UNSAFE_THRESHOLD = 0.75;

let modelPromise: Promise<NSFWJS> | null = null;

function getModel(): Promise<NSFWJS> {
  // Loaded lazily on first use (not at app boot) so a slow first load never
  // delays server startup, and cached here so it only happens once per
  // running process - loading is the expensive part, classifying afterward
  // is fast.
  modelPromise ??= nsfwjs.load();
  return modelPromise;
}

// Exported as a plain function (rather than folded into the class) so the
// threshold decision itself is directly testable without needing a real
// image/model pipeline in tests.
export function isUnsafe(predictions: PredictionType[]): boolean {
  const unsafeScore = predictions
    .filter((p) => UNSAFE_CLASSES.has(p.className))
    .reduce((max, p) => Math.max(max, p.probability), 0);
  return unsafeScore >= UNSAFE_THRESHOLD;
}

// jpeg-js/pngjs both decode to RGBA; nsfwjs's model expects 3-channel RGB.
function rgbaToRgb(data: Uint8Array | Buffer, width: number, height: number): Uint8Array {
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; j < rgb.length; i += 4, j += 3) {
    rgb[j] = data[i];
    rgb[j + 1] = data[i + 1];
    rgb[j + 2] = data[i + 2];
  }
  return rgb;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // The flagged image itself is never stored (the block happens before it
  // ever reaches storage) - this is purely so an admin has somewhere to
  // actually see it happened, in Recent Activity, instead of it vanishing
  // into a rejected request only the uploader ever saw. restaurantId is
  // null for the rare case of an admin's own upload getting blocked.
  async recordBlocked(restaurantId: string | null, originalName: string): Promise<void> {
    await this.prisma.db.blockedUpload.create({ data: { restaurantId, originalName } });
  }

  // Only jpg/png are actually decoded here - the two formats the pure-JS
  // decoders below handle without a native image library. webp/gif/video
  // pass through unmoderated (a real, known gap, not silently pretended to
  // be covered). Any failure at all - corrupt image, a decode edge case,
  // the model failing to load - also passes the upload through rather than
  // blocking it: a best-effort safety net must never be able to take down
  // the core upload feature itself.
  async isExplicit(buffer: Buffer, ext: string): Promise<boolean> {
    try {
      const tensor = this.decode(buffer, ext);
      if (!tensor) return false;
      try {
        const model = await getModel();
        const predictions = await model.classify(tensor);
        return isUnsafe(predictions);
      } finally {
        tensor.dispose();
      }
    } catch (err) {
      this.logger.warn(`Photo moderation check failed, allowing the upload through: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  private decode(buffer: Buffer, ext: string): tf.Tensor3D | null {
    if (ext === 'jpg' || ext === 'jpeg') {
      const { width, height, data } = jpeg.decode(buffer, { useTArray: true });
      return tf.tensor3d(rgbaToRgb(data, width, height), [height, width, 3]);
    }
    if (ext === 'png') {
      const png = PNG.sync.read(buffer);
      return tf.tensor3d(rgbaToRgb(png.data, png.width, png.height), [png.height, png.width, 3]);
    }
    return null;
  }
}
