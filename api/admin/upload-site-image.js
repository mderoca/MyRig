/**
 * POST /api/admin/upload-site-image
 *
 * Admin-only. Uploads a base64-encoded image to the `product-images` Supabase
 * Storage bucket under `site/<key>/<timestamp>.<ext>` and upserts the resulting
 * public URL into `site_images.url` for the given key.
 *
 * Request body (application/json):
 *   {
 *     key:         string,            // required, e.g. 'home_hero'
 *     filename:    string,            // required, used only for the extension
 *     contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
 *     dataBase64:  string             // required, raw base64 (no data-URL prefix)
 *   }
 *
 * Response: { key, imageUrl }
 */

import { sql } from '../../db/connection.js'
import { AuthError, assertSameOrigin, requireAdmin } from '../_lib/auth.js'
import {
  PRODUCT_IMAGES_BUCKET,
  assertStorageConfigured,
  storageAdmin,
} from '../_lib/storage.js'

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_BYTES = 5 * 1024 * 1024

// The allowed key list is deliberately closed. Adding one is a code change,
// which prevents an admin from spraying arbitrary keys into the table and
// having no idea what they refer to a year later.
const ALLOWED_KEYS = new Set(['home_hero'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertSameOrigin(req)
    assertStorageConfigured()
    await requireAdmin(req)

    const { key, contentType, dataBase64 } = req.body ?? {}

    if (typeof key !== 'string' || !ALLOWED_KEYS.has(key)) {
      return res.status(400).json({
        error: `Unknown site image key. Allowed: ${[...ALLOWED_KEYS].join(', ')}.`,
      })
    }
    if (typeof dataBase64 !== 'string' || !dataBase64) {
      return res.status(400).json({ error: 'dataBase64 is required.' })
    }
    const extension = ALLOWED_TYPES[contentType]
    if (!extension) {
      return res.status(400).json({
        error: 'Unsupported image type. Use jpeg, png, webp, or gif.',
      })
    }

    let bytes
    try {
      bytes = Buffer.from(dataBase64, 'base64')
    } catch {
      return res.status(400).json({ error: 'dataBase64 is not valid base64.' })
    }
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      return res.status(413).json({ error: `Image must be 1 byte to ${MAX_BYTES} bytes.` })
    }

    const objectPath = `site/${key}/${Date.now()}.${extension}`

    const { error: uploadError } = await storageAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, bytes, { contentType, upsert: false })

    if (uploadError) {
      console.error('[upload-site-image] storage upload failed:', uploadError)
      return res.status(500).json({ error: 'Could not upload the image.' })
    }

    const { data: publicUrl } = storageAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(objectPath)

    const imageUrl = publicUrl.publicUrl

    await sql`
      INSERT INTO site_images (key, url, updated_at)
      VALUES (${key}, ${imageUrl}, NOW())
      ON CONFLICT (key) DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()
    `

    return res.status(200).json({ key, imageUrl })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('[api/admin/upload-site-image]', err)
    return res.status(500).json({ error: 'Upload failed.' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
}
