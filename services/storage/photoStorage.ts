/**
 * Store employee profile photos in Supabase Storage and return the public
 * CDN URL. The DB columns (`employees.photo` / `user_profiles.image`) hold
 * the URL string instead of a base64 blob, so list queries ship a short
 * text value and the Supabase CDN serves the image bytes with caching.
 */
import { supabase } from '../../lib/supabase';

const BUCKET = 'employee-photos';
const cacheControl = '31536000';

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'image/webp';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  return 'webp';
}

/**
 * Upload a compressed base64 data URL for `id` into the bucket and return
 * its public URL.
 *
 * Path layout is `{orgId}/avatars/{id}-{timestamp}.{ext}`:
 * - The org folder is what the storage RLS policy checks, so a user can
 *   only write inside their own tenant's folder.
 * - The timestamp guarantees a fresh URL per upload, so the long
 *   Cache-Control header can never serve a stale photo.
 */
export async function uploadPhotoToStorage(
  dataUrl: string,
  id: string,
  orgId: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${orgId}/avatars/${id}-${Date.now()}.${extensionFor(blob.type)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
    cacheControl,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Remove a photo previously stored by this bucket, given its public URL.
 *
 * No-ops when the value isn't one of our own object URLs (legacy base64,
 * external https, etc.), so it's safe to call with any stored photo value.
 * Deletion is best-effort — callers run it fire-and-forget after the DB
 * write succeeds, so a failed delete only leaves an orphan file behind.
 */
export async function deletePhotoFromStorage(photo?: string | null): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  if (!photo) return;

  const idx = photo.indexOf(marker);
  if (idx < 0) return;

  const path = photo.slice(idx + marker.length);
  if (!path || !path.includes('/avatars/')) return;

  await supabase.storage.from(BUCKET).remove([path]);
}
