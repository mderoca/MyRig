/**
 * POST /api/auth/register  { email, password, displayName }
 *
 * Creates an account and signs the user straight in.
 * Response: { user: { id, email, displayName, createdAt } }
 */

import { sql } from '../../../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from '../catalog.js'
import {
  AuthError,
  assertSameOrigin,
  hashPassword,
  rateLimit,
  startSession,
  validateCredentials,
  publicUser,
} from '../auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertDatabase()
    assertSameOrigin(req)

    const { email, password, displayName } = req.body || {}

    const errors = validateCredentials({ email, password, displayName }, { isRegister: true })
    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') })
    }

    // Stored lower-cased so nobody ends up with two accounts differing only by case.
    const normalizedEmail = email.trim().toLowerCase()

    // Throttled per email: stops someone scripting thousands of signups.
    await rateLimit(`register:${normalizedEmail}`, { max: 5, windowSeconds: 3600 })

    const passwordHash = await hashPassword(password)

    let user
    try {
      ;[user] = await sql`
        INSERT INTO users (email, password_hash, display_name)
        VALUES (${normalizedEmail}, ${passwordHash}, ${displayName.trim()})
        RETURNING id, email, display_name, created_at
      `
    } catch (err) {
      // 23505 = unique_violation on users.email
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An account with that email already exists.' })
      }
      throw err
    }

    await startSession(res, user)

    return res.status(201).json({ user: publicUser(user) })
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    // Never log the email or password - see secure-coding rule 10.
    console.error('[api/auth/register]', status, err.message)
    return res
      .status(status)
      .json({ error: status === 500 ? 'Could not create your account.' : err.message })
  }
}
