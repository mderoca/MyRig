/**
 * POST /api/auth/change-password  { currentPassword, newPassword }
 *
 * Changes the signed-in user's password. Requires the CURRENT password even
 * though the session cookie already proves identity — this stops a stolen
 * session from being able to lock the real owner out.
 *
 * SECURITY
 *   - bcrypt.compare runs on every attempt, and rate-limit runs before that,
 *     so guessing costs both CPU and rate-limit budget.
 *   - The current session is NOT invalidated by a password change. That is a
 *     defensible default for a small app: the user is standing at their own
 *     computer, they don't want to be signed out mid-flow. If we later track
 *     multiple devices, this is where a "sign out other sessions" checkbox
 *     would live.
 *
 * Response: { ok: true }
 */

import { sql } from '../../../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from '../catalog.js'
import {
  AuthError,
  assertSameOrigin,
  clearRateLimit,
  hashPassword,
  rateLimit,
  requireUser,
  verifyPassword,
} from '../auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertDatabase()
    assertSameOrigin(req)

    const user = await requireUser(req)

    const { currentPassword, newPassword } = req.body || {}

    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({ error: 'Enter your current password.' })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' })
    }
    if (newPassword.length > 200) {
      // bcrypt silently truncates past 72 bytes; reject long input rather than
      // let someone believe a 300-character password is doing anything.
      return res.status(400).json({ error: 'Password must be 200 characters or fewer.' })
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from the current one.' })
    }

    const bucket = `change-password:${user.email}`
    await rateLimit(bucket, { max: 8, windowSeconds: 900 })

    const [{ password_hash: hash } = {}] = await sql`
      SELECT password_hash FROM users WHERE id = ${user.id}
    `
    const ok = await verifyPassword(currentPassword, hash)
    if (!ok) {
      return res.status(401).json({ error: 'Current password is incorrect.' })
    }

    await clearRateLimit(bucket)

    const newHash = await hashPassword(newPassword)
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`

    return res.status(200).json({ ok: true })
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/auth/change-password]', status, err.message)
    return res.status(status).json({
      error: status === 500 ? 'Could not change your password.' : err.message,
    })
  }
}
