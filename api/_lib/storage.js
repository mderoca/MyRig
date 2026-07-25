/**
 * Supabase Storage helper.
 *
 * The service-role client bypasses Row Level Security. That is fine because
 * this file is imported only by server-side API routes that have already
 * verified the caller is an admin (see requireAdmin in ./auth.js). It must
 * never be imported from client code and the service-role key must never be
 * sent to the browser.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const PRODUCT_IMAGES_BUCKET = 'product-images'

export const hasStorage = Boolean(url && serviceRoleKey)

export const storageAdmin = hasStorage
  ? createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export function assertStorageConfigured() {
  if (!hasStorage) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'
    )
  }
}

/**
 * Given a public Supabase Storage URL, return the object path inside the given
 * bucket (e.g. `products/17/12345.png`). Returns null when the URL is empty,
 * points at a different bucket, or is not recognisable — callers treat that as
 * "nothing to delete" rather than an error.
 *
 * Public URLs look like:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export function objectPathFromPublicUrl(url, bucket) {
  if (typeof url !== 'string' || !url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

/**
 * Best-effort delete of an object we're about to orphan. Never throws — if the
 * old image is unreachable or already gone, that's not worth failing a
 * successful replace over.
 */
export async function deleteObjectIfPresent(bucket, path) {
  if (!path) return
  try {
    const { error } = await storageAdmin.storage.from(bucket).remove([path])
    if (error) console.warn('[storage] could not delete old object', path, error.message)
  } catch (err) {
    console.warn('[storage] delete threw for', path, err.message)
  }
}
