/**
 * One-shot Supabase Storage setup.
 *
 *   npm run storage:setup
 *
 * Creates the `product-images` bucket if it doesn't already exist, marked as
 * public so uploaded images can be served straight from a CDN URL without
 * signing every request. Idempotent — safe to run repeatedly.
 */

import dotenv from 'dotenv'

dotenv.config()

const { storageAdmin, PRODUCT_IMAGES_BUCKET, hasStorage } = await import('../api/_lib/storage.js')

if (!hasStorage) {
  console.error(
    '\nSupabase Storage is not configured.\n' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env and try again.\n'
  )
  process.exit(1)
}

const { data: existing, error: listError } = await storageAdmin.storage.listBuckets()
if (listError) {
  console.error('Could not list buckets:', listError.message)
  process.exit(1)
}

if (existing.some((bucket) => bucket.name === PRODUCT_IMAGES_BUCKET)) {
  console.log(`Bucket '${PRODUCT_IMAGES_BUCKET}' already exists. Nothing to do.`)
  process.exit(0)
}

const { error: createError } = await storageAdmin.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
  public: true,
  // 5 MB per file. Product shots do not need to be bigger, and this caps abuse.
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
})

if (createError) {
  console.error(`Could not create bucket '${PRODUCT_IMAGES_BUCKET}':`, createError.message)
  process.exit(1)
}

console.log(`Created public bucket '${PRODUCT_IMAGES_BUCKET}'.`)
