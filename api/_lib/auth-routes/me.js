/**
 * GET /api/auth/me
 *
 * Who is signed in. The frontend calls this once on load to restore the session.
 * Returns { user: null } rather than a 401 when nobody is signed in - being
 * signed out is a normal state, not an error.
 */

import { getUser, publicUser } from '../auth.js'
import { hasDatabase } from '../../../db/connection.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  // With no database there are no users - that is "signed out", not a failure.
  if (!hasDatabase) {
    return res.status(200).json({ user: null })
  }

  try {
    const user = await getUser(req)
    return res.status(200).json({ user: user ? publicUser(user) : null })
  } catch (err) {
    console.error('[api/auth/me]', err.message)
    return res.status(200).json({ user: null })
  }
}
