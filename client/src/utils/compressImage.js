/**
 * Shrink a photo in the browser before upload: longest side ≤ maxSide, re-encoded as JPEG.
 * Phone camera photos (4–12 MB) exceed the server's 5 MB limit; after this they are a few hundred KB.
 * Small images and non-raster files (e.g. SVG, GIF) are returned unchanged.
 */
export default async function compressImage(file, { maxSide = 1600, quality = 0.85, skipBelowBytes = 400 * 1024 } = {}) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || file.size <= skipBelowBytes) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // Browser can't decode it (e.g. HEIC on desktop Chrome): let the server decide.
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}
