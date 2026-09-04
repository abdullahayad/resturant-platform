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
    // Deliberately required here rather than imported at the top of the
    // file: expo-image-manipulator resolves its native module the instant
    // it's imported (not when it's called), which throws on any app build
    // that predates this dependency being added — crashing every screen
    // that so much as imports this file, before resize is ever attempted.
    // A lazy require() inside this try/catch means that throw only ever
    // happens here, on an actual upload attempt, where it's already
    // handled — not the moment the screen opens.
    const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
    const longestEdgeIsWidth = width >= height;
    const action = longestEdgeIsWidth ? { resize: { width: MAX_DIMENSION } } : { resize: { height: MAX_DIMENSION } };
    const result = await manipulateAsync(uri, [action], { compress: 0.8, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // If resizing fails for any reason (including the native module not
    // being available on this build yet), upload the original rather than
    // blocking the user's upload entirely over an optimization.
    return uri;
  }
}
