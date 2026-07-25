/**
 * POST /api/admin/upload-product-image
 *
 * Admin-only. Accepts a base64-encoded image, uploads it to the
 * `product-images` Supabase Storage bucket, and writes the resulting public URL
 * onto the corresponding `products.image_url`.
 *
 * Request body (application/json):
 *   {
 *     productId:   number,           // required
 *     filename:    string,           // required, used only for the extension
 *     contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
 *     dataBase64:  string            // required, raw base64 (no data-URL prefix)
 *   }
 *
 * Response: { imageUrl }
 *
 * WHY base64 in JSON rather than multipart/form-data:
 *   The dev-mode API middleware in vite.config.js only reads JSON bodies. Base64
 *   costs ~33% payload overhead, which at our 5 MB file cap is easily inside a
 *   normal request budget. Simpler beats optimal here.
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

const MAX_BYTES = 5 * 1024 * 1024 // matches the bucket's fileSizeLimit

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertSameOrigin(req)
    assertStorageConfigured()
    await requireAdmin(req)

    const { productId, filename, contentType, dataBase64 } = req.body ?? {}

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'productId must be a positive integer.' })
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

    // Confirm the product exists before uploading, so we don't leave orphan
    // objects in the bucket if the caller made up a productId. Also grab the
    // current image_url so we can garbage-collect it once the swap succeeds.
    const [product] = await sql`SELECT id, image_url FROM products WHERE id = ${productId}`
    if (!product) {
      return res.status(404).json({ error: 'No product with that id.' })
    }
    const previousPath = objectPathFromPublicUrl(product.image_url, PRODUCT_IMAGES_BUCKET)

    // Timestamp keeps successive uploads for the same product from colliding,
    // and prevents someone learning a URL by guessing product ids alone.
    const objectPath = `products/${productId}/${Date.now()}.${extension}`

    const { error: uploadError } = await storageAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, bytes, { contentType, upsert: false })

    if (uploadError) {
      console.error('[upload-product-image] storage upload failed:', uploadError)
      return res.status(500).json({ error: 'Could not upload the image.' })
    }

    const { data: publicUrl } = storageAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(objectPath)

    const imageUrl = publicUrl.publicUrl

    await sql`UPDATE products SET image_url = ${imageUrl} WHERE id = ${productId}`

    // The DB now points at the new object. Best-effort delete of the old one —
    // a failure here leaves an orphan but does NOT unwind the replace, since
    // the user's intent (new image is live) has already been served.
    await deleteObjectIfPresent(PRODUCT_IMAGES_BUCKET, previousPath)

    return res.status(200).json({ imageUrl })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('[api/admin/upload-product-image]', err)
    return res.status(500).json({ error: 'Upload failed.' })
  }
}
