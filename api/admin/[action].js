/**
 * /api/admin/:action  ->  upload-product-image | upload-site-image
 *
 * ONE serverless function covering both admin upload endpoints. The URLs are
 * unchanged - /api/admin/upload-product-image still works exactly as before -
 * and so is the logic: each handler still lives in its own file under
 * _lib/admin-routes/, this only dispatches to them.
 *
 * WHY: Vercel turns every file under /api into its own serverless function, and
 * the Hobby plan allows 12 per deployment. Two separate admin routes pushed
 * the project to 13, so the build failed before it deployed anything. Folding
 * them into one dynamic route brings it back to 12. See the identical pattern
 * in api/auth/[action].js.
 *
 * Files under api/_lib/ are helper modules, not routes - Vercel does not turn
 * them into functions. That is why the handlers moved there rather than staying
 * in api/admin/ with an underscore prefix.
 *
 * The `action` name comes from this file's own name: Vercel puts the matched
 * path segment in req.query.action for [action].js. The dev middleware in
 * vite.config.js does the same.
 */

import uploadProductImage from '../_lib/admin-routes/upload-product-image.js'
import uploadSiteImage from '../_lib/admin-routes/upload-site-image.js'
import uploadLearningCardImage from '../_lib/admin-routes/upload-learning-card-image.js'

const HANDLERS = {
  'upload-product-image': uploadProductImage,
  'upload-site-image': uploadSiteImage,
  'upload-learning-card-image': uploadLearningCardImage,
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '')
  const route = Object.prototype.hasOwnProperty.call(HANDLERS, action) ? HANDLERS[action] : null

  if (!route) {
    return res.status(404).json({
      error: `Unknown admin action. Expected one of: ${Object.keys(HANDLERS).join(', ')}.`,
    })
  }

  // Each handler does its own method check, origin check, admin check and
  // error handling — this deliberately adds no behaviour of its own.
  return route(req, res)
}

// Vercel: bump body size for image uploads (5 MB image + base64 overhead).
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
}
