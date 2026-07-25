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
