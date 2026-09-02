import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1600;

// A phone camera photo can be 3000-4000px wide and several MB even at the
// picker's own quality setting, which only affects JPEG compression, not
// pixel dimensions. Nobody needs that much resolution for a gallery/menu
// photo — this shrinks the longest edge down before upload, cutting upload
// time and storage cost with no visible quality loss at display size.
// width/height come from the ImagePicker asset that already knows the
// original dimensions — skip resizing (and any risk of upscaling) when the
// photo is already small enough.
export async function resizeForUpload(uri: string, width: number, height: number): Promise<string> {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) return uri;
  try {
    const longestEdgeIsWidth = width >= height;
    const action = longestEdgeIsWidth ? { resize: { width: MAX_DIMENSION } } : { resize: { height: MAX_DIMENSION } };
    const result = await manipulateAsync(uri, [action], { compress: 0.8, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // If resizing fails for any reason, upload the original rather than
    // blocking the user's upload entirely over an optimization.
    return uri;
  }
}
