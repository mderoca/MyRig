/**
 * POST /api/auth/login  { email, password }
 *
 * Response: { user: { id, email, displayName, createdAt } }
 *
 * The failure message is the same whether the email is unknown or the password
 * is wrong - and the bcrypt comparison runs either way - so this route leaks
 * nothing about which emails are registered.
 */

import { sql } from '../../../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from '../catalog.js'
import {
  AuthError,
  assertSameOrigin,
  clearRateLimit,
  rateLimit,
  startSession,
  verifyPassword,
  publicUser,
} from '../auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertDatabase()
    assertSameOrigin(req)

    const { email, password } = req.body || {}

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase().slice(0, 200)
    const bucket = `login:${normalizedEmail}`

    // Throttle before touching the password, so this also rate-limits guessing.
    await rateLimit(bucket, { max: 8, windowSeconds: 900 })

    const [user] = await sql`
      SELECT id, email, password_hash, display_name, created_at
      FROM users
      WHERE email = ${normalizedEmail}
    `

    // Runs bcrypt against a dummy hash when the user does not exist, so a miss
    // costs the same time as a hit and cannot be distinguished by timing.
    const ok = await verifyPassword(password, user?.password_hash)

    if (!user || !ok) {
      return res.status(401).json({ error: 'Email or password is incorrect.' })
    }

    await clearRateLimit(bucket)
    await startSession(res, user)

    return res.status(200).json({ user: publicUser(user) })
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/auth/login]', status, err.message)
    return res.status(status).json({ error: status === 500 ? 'Could not sign you in.' : err.message })
  }
}
