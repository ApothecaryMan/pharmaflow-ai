/**
 * Compress an image file into a compact data URL (WebP when supported,
 * JPEG otherwise). Resizes the largest dimension down to `maxDim` so
 * profile photos stored in the DB stay small.
 *
 * Falls back to a plain data URL when the file can't be decoded by the
 * browser (e.g. HEIC) so uploads never fail.
 */

let webpSupported: boolean | undefined;

function supportsWebp(): boolean {
  if (webpSupported === undefined) {
    webpSupported = document
      .createElement('canvas')
      .toDataURL('image/webp')
      .startsWith('data:image/webp');
  }
  return webpSupported;
}

export async function compressImage(
  file: File,
  options?: { maxDim?: number; quality?: number }
): Promise<string> {
  const maxDim = options?.maxDim ?? 512;
  const quality = options?.quality ?? 0.82;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const outW = Math.max(1, Math.round(bitmap.width * scale));
    const outH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return fileToDataUrl(file);
    }

    if (supportsWebp()) {
      // WebP supports alpha, so draw without flattening to preserve transparency.
      ctx.drawImage(bitmap, 0, 0, outW, outH);
      bitmap.close();
      return canvas.toDataURL('image/webp', quality);
    }

    // JPEG has no alpha channel, so flatten transparency onto a white background.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return fileToDataUrl(file);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
