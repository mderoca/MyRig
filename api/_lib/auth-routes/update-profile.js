/**
 * POST /api/auth/update-profile  { displayName?, email?, currentPassword? }
 *
 * Updates the signed-in user's display name and/or email address. Password
 * changes go through /api/auth/change-password — this route deliberately
 * refuses `password` in the body to keep the two flows separate and each one
 * as narrow as possible.
 *
 * SECURITY
 *   - Changing email requires `currentPassword`. Without that, a stolen
 *     session cookie could be used to walk off with the account by pointing it
 *     at a new address.
 *   - Changing only the display name does NOT require the password: the risk
 *     is small (a name is public) and asking would be friction for a routine
 *     tweak.
 *   - Both bcrypt.compare AND rate-limit run when currentPassword is supplied,
 *     so trying different passwords costs both real CPU and rate-limit budget.
 *
 * Response: { user: publicUser }
 */

import { sql } from '../../../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from '../catalog.js'
import {
  AuthError,
  assertSameOrigin,
  clearRateLimit,
  publicUser,
  rateLimit,
  requireUser,
  verifyPassword,
} from '../auth.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertDatabase()
    assertSameOrigin(req)

    const user = await requireUser(req)

    const body = req.body || {}
    const wantsDisplayName = typeof body.displayName === 'string'
    const wantsEmail = typeof body.email === 'string'

    if (!wantsDisplayName && !wantsEmail) {
      return res.status(400).json({ error: 'Nothing to change.' })
    }

    // Compute the target values, keeping the current ones when a field is absent.
    let nextDisplayName = user.display_name
    let nextEmail = user.email

    if (wantsDisplayName) {
      const trimmed = body.displayName.trim()
      if (!trimmed) return res.status(400).json({ error: 'Enter your name.' })
      if (trimmed.length > 80) return res.status(400).json({ error: 'Name must be 80 characters or fewer.' })
      nextDisplayName = trimmed
    }

    if (wantsEmail) {
      const normalized = body.email.trim().toLowerCase()
      if (!EMAIL_PATTERN.test(normalized) || normalized.length > 200) {
        return res.status(400).json({ error: 'Enter a valid email address.' })
      }
      nextEmail = normalized
    }

    const emailIsChanging = nextEmail !== user.email

    // Email change requires the current password. getUser deliberately does not
    // return password_hash, so fetch it explicitly here — and only here.
    if (emailIsChanging) {
      if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
        return res.status(400).json({ error: 'Enter your current password to change your email.' })
      }

      const bucket = `update-profile:${user.email}`
      await rateLimit(bucket, { max: 8, windowSeconds: 900 })

      const [{ password_hash: hash } = {}] = await sql`
        SELECT password_hash FROM users WHERE id = ${user.id}
      `
      const ok = await verifyPassword(body.currentPassword, hash)
      if (!ok) {
        return res.status(401).json({ error: 'Current password is incorrect.' })
      }

      await clearRateLimit(bucket)
    }

    // Nothing actually different? Return the user as-is rather than a no-op UPDATE.
    if (!emailIsChanging && nextDisplayName === user.display_name) {
      return res.status(200).json({ user: publicUser(user) })
    }

    let updated
    try {
      ;[updated] = await sql`
        UPDATE users
           SET display_name = ${nextDisplayName},
               email        = ${nextEmail}
         WHERE id = ${user.id}
        RETURNING id, email, display_name, role, created_at
      `
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An account with that email already exists.' })
      }
      throw err
    }

    return res.status(200).json({ user: publicUser(updated) })
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/auth/update-profile]', status, err.message)
    return res.status(status).json({
      error: status === 500 ? 'Could not update your profile.' : err.message,
    })
  }
}
