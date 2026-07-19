/**
 * /api/auth/:action  ->  register | login | logout | me
 *
 * ONE serverless function covering all four auth endpoints. The URLs are
 * unchanged - /api/auth/register still works exactly as before - and so is the
 * logic: each handler still lives in its own file under _lib/auth-routes/, this
 * only dispatches to them.
 *
 * WHY: Vercel turns every file under /api into its own serverless function, and
 * the Hobby plan allows 12 per deployment. Four separate auth routes put the
 * project at 13, so the build failed before it deployed anything. Folding them
 * into one dynamic route brings it to 10, with headroom for two more endpoints.
 *
 * Files under api/_lib/ are helper modules, not routes - Vercel does not turn
 * them into functions. That is why the handlers moved there rather than staying
 * in api/auth/ with an underscore prefix.
 *
 * The `action` name comes from this file's own name: Vercel puts the matched
 * path segment in req.query.action for [action].js. The dev middleware in
 * vite.config.js does the same.
 */

import register from '../_lib/auth-routes/register.js'
import login from '../_lib/auth-routes/login.js'
import logout from '../_lib/auth-routes/logout.js'
import me from '../_lib/auth-routes/me.js'

const HANDLERS = { register, login, logout, me }

export default async function handler(req, res) {
  const action = String(req.query?.action || '')
  const route = Object.prototype.hasOwnProperty.call(HANDLERS, action) ? HANDLERS[action] : null

  if (!route) {
    return res.status(404).json({
      error: `Unknown auth action. Expected one of: ${Object.keys(HANDLERS).join(', ')}.`,
    })
  }

  // Each handler does its own method check, origin check and error handling -
  // this deliberately adds no behaviour of its own.
  return route(req, res)
}
