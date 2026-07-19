/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Always succeeds - logging out of a session you do
 * not have is not an error.
 */

import { assertSameOrigin, endSession, AuthError } from '../auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertSameOrigin(req)
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500
    return res.status(status).json({ error: err.message })
  }

  endSession(res)
  return res.status(200).json({ ok: true })
}
