/**
 * POST /api/admin/upload-learning-card-image
 *
 * Admin-only. Accepts a base64-encoded image, uploads it to the
 * `product-images` Supabase Storage bucket under `learning/<cardId>/…`, and
 * writes the resulting public URL onto the corresponding
 * `learning_cards.image_url`.
 *
 * Request body (application/json):
 *   {
 *     cardId:      number,           // required, learning_cards.id
 *     filename:    string,           // required, used only for the extension
 *     contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
 *     dataBase64:  string            // required, raw base64 (no data-URL prefix)
 *   }
 *
 * Response: { imageUrl }
 */

import { sql } from '../../../db/connection.js'
import { AuthError, assertSameOrigin, requireAdmin } from '../auth.js'
import {
  PRODUCT_IMAGES_BUCKET,
  assertStorageConfigured,
  deleteObjectIfPresent,
  objectPathFromPublicUrl,
  storageAdmin,
} from '../storage.js'

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_BYTES = 5 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertSameOrigin(req)
    assertStorageConfigured()
    await requireAdmin(req)

    const { cardId, contentType, dataBase64 } = req.body ?? {}

    if (!Number.isInteger(cardId) || cardId <= 0) {
      return res.status(400).json({ error: 'cardId must be a positive integer.' })
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

    const [card] = await sql`SELECT id, image_url FROM learning_cards WHERE id = ${cardId}`
    if (!card) {
      return res.status(404).json({ error: 'No learning card with that id.' })
    }
    const previousPath = objectPathFromPublicUrl(card.image_url, PRODUCT_IMAGES_BUCKET)

    const objectPath = `learning/${cardId}/${Date.now()}.${extension}`

    const { error: uploadError } = await storageAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, bytes, { contentType, upsert: false })

    if (uploadError) {
      console.error('[upload-learning-card-image] storage upload failed:', uploadError)
      return res.status(500).json({ error: 'Could not upload the image.' })
    }

    const { data: publicUrl } = storageAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(objectPath)

    const imageUrl = publicUrl.publicUrl

    await sql`UPDATE learning_cards SET image_url = ${imageUrl} WHERE id = ${cardId}`

    // Best-effort delete of the previous object — see notes on the sibling
    // upload endpoints. A failure leaves an orphan but does not unwind the
    // replace, since the new image is already live.
    await deleteObjectIfPresent(PRODUCT_IMAGES_BUCKET, previousPath)

    return res.status(200).json({ imageUrl })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('[api/admin/upload-learning-card-image]', err)
    return res.status(500).json({ error: 'Upload failed.' })
  }
}
