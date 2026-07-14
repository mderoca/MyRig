/**
 * Authentication for MyRig.
 *
 * Email + password, bcrypt-hashed, with the session carried in a signed JWT
 * inside an httpOnly cookie.
 *
 * The security decisions, and why:
 *
 * - **bcrypt, never plaintext.** Passwords are hashed with a cost factor of 10
 *   and only the hash is stored. The plaintext is never written to the database,
 *   never logged, and never returned by any route. Cost 10 rather than 12
 *   because these run in serverless functions with a cold-start budget; 10 is
 *   still ~100ms of work per guess for an attacker.
 *
 * - **httpOnly cookie, not localStorage.** A JWT in localStorage is readable by
 *   any XSS on the page. An httpOnly cookie is not readable by JavaScript at
 *   all, so a script injection cannot steal the session.
 *
 * - **SameSite=Lax is the CSRF defence.** The browser will not attach this
 *   cookie to a cross-site POST/DELETE, so another site cannot make an
 *   authenticated state-changing request on the user's behalf. assertSameOrigin()
 *   below is a second belt-and-braces check on the Origin header.
 *
 * - **Timing.** Login always runs a bcrypt comparison, even when the email does
 *   not exist, so response time does not reveal which emails are registered.
 *
 * - **Errors are deliberately vague.** "Email or password is incorrect" never
 *   says which one was wrong.
 */

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { sql } from '../../db/connection.js'

const COOKIE_NAME = 'myrig_session'
const SESSION_DAYS = 7
const BCRYPT_COST = 10

/** A bcrypt hash of a dummy password, used to burn the same CPU on a miss as on a hit. */
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.status = status
  }
}

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new AuthError(
      'AUTH_SECRET is not set on the server, or is shorter than 32 characters. See the README.',
      500
    )
  }
  return new TextEncoder().encode(value)
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export const hashPassword = (plaintext) => bcrypt.hash(plaintext, BCRYPT_COST)

/** Always does the work, even with no hash to compare against - see "Timing" above. */
export const verifyPassword = (plaintext, hash) => bcrypt.compare(plaintext, hash || DUMMY_HASH)

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

async function signSession(user) {
  return new SignJWT({ email: user.email, name: user.display_name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret())
}

/** Sets the session cookie on the response. Call this after register/login. */
export async function startSession(res, user) {
  const token = await signSession(user)

  const attributes = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly', // unreadable from JavaScript, so XSS cannot steal it
    'Path=/',
    'SameSite=Lax', // the browser will not send this on a cross-site POST -> CSRF defence
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ]

  // Secure would make the cookie unusable over plain http://localhost in dev.
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    attributes.push('Secure')
  }

  res.setHeader('Set-Cookie', attributes.join('; '))
}

export function endSession(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  )
}

function readCookie(req, name) {
  const header = req.headers?.cookie
  if (!header) return null

  for (const pair of header.split(';')) {
    const index = pair.indexOf('=')
    if (index === -1) continue
    if (pair.slice(0, index).trim() === name) {
      return decodeURIComponent(pair.slice(index + 1).trim())
    }
  }
  return null
}

/**
 * The signed-in user, or null. Re-reads the user from the database rather than
 * trusting the JWT payload, so a deleted user cannot keep using a valid token.
 */
export async function getUser(req) {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return null

  let userId
  try {
    const { payload } = await jwtVerify(token, secret())
    userId = Number(payload.sub)
  } catch {
    return null // expired, tampered with, or signed by a different secret
  }

  if (!Number.isInteger(userId)) return null

  const [user] = await sql`
    SELECT id, email, display_name, created_at FROM users WHERE id = ${userId}
  `

  return user || null
}

/**
 * Guards a route. Returns the user, or throws AuthError(401).
 *
 * Every route that touches a user's own data must call this and then scope its
 * query by the returned id - being logged in is not the same as being allowed
 * to see THIS row.
 */
export async function requireUser(req) {
  const user = await getUser(req)
  if (!user) throw new AuthError('You need to sign in to do that.', 401)
  return user
}

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

/**
 * Rejects state-changing requests that did not come from our own origin.
 *
 * SameSite=Lax already stops the browser attaching the session cookie to a
 * cross-site POST. This is the second line: if an Origin header is present and
 * is not us, refuse.
 */
export function assertSameOrigin(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return

  const origin = req.headers.origin
  if (!origin) return // same-origin non-browser callers (curl, tests) send no Origin

  const host = req.headers['x-forwarded-host'] || req.headers.host
  let originHost
  try {
    originHost = new URL(origin).host
  } catch {
    throw new AuthError('Bad Origin header.', 403)
  }

  if (originHost !== host) {
    throw new AuthError('Cross-site requests are not allowed.', 403)
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * Throttles an abuse-prone action (login, register).
 *
 * Backed by the database, not memory: serverless functions do not share memory,
 * so an in-process counter would reset on every cold start and throttle nothing.
 *
 * @param bucket  e.g. `login:${email}` - the thing being limited
 * @param max     attempts allowed per window
 * @param windowSeconds  length of the window
 * @throws AuthError(429) when the limit is exceeded
 */
export async function rateLimit(bucket, { max = 8, windowSeconds = 900 } = {}) {
  const [row] = await sql`
    INSERT INTO rate_limits (bucket, attempts, window_start)
    VALUES (${bucket}, 1, NOW())
    ON CONFLICT (bucket) DO UPDATE SET
      -- Outside the window? start a fresh one. Inside it? count this attempt.
      attempts = CASE
        WHEN rate_limits.window_start < NOW() - (${windowSeconds} || ' seconds')::INTERVAL THEN 1
        ELSE rate_limits.attempts + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < NOW() - (${windowSeconds} || ' seconds')::INTERVAL THEN NOW()
        ELSE rate_limits.window_start
      END
    RETURNING attempts
  `

  if (row.attempts > max) {
    throw new AuthError('Too many attempts. Wait a few minutes and try again.', 429)
  }
}

/** Clears the counter after a successful login, so one bad day is not held against you. */
export async function clearRateLimit(bucket) {
  await sql`DELETE FROM rate_limits WHERE bucket = ${bucket}`
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Deliberately permissive - the point is to reject obvious junk, not to police
// what a valid email looks like. The only real test is whether mail arrives.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCredentials({ email, password, displayName }, { isRegister = false } = {}) {
  const errors = []

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email) || email.length > 200) {
    errors.push('Enter a valid email address.')
  }

  if (typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  } else if (password.length > 200) {
    // bcrypt silently truncates past 72 bytes; reject long input rather than
    // let someone believe a 300-character password is doing anything.
    errors.push('Password must be 200 characters or fewer.')
  }

  if (isRegister) {
    if (typeof displayName !== 'string' || !displayName.trim()) {
      errors.push('Enter your name.')
    } else if (displayName.length > 80) {
      errors.push('Name must be 80 characters or fewer.')
    }
  }

  return errors
}

/** The only shape of a user that is ever sent to the browser. Never includes the hash. */
export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.display_name,
  createdAt: user.created_at,
})
