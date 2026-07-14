/**
 * Auth check - `npm run check:auth`
 *
 * Exercises the security-critical parts of api/_lib/auth.js that do NOT need a
 * database: password hashing, credential validation, the session cookie, and the
 * CSRF origin check.
 *
 * What this does NOT cover (it needs a live Neon database - see the README):
 *   - getUser() re-reading the user from the users table
 *   - rateLimit() against the rate_limits table
 *   - the register/login routes end to end
 *
 * Run with AUTH_SECRET set (dotenv loads .env), or it supplies a test secret.
 */

import dotenv from 'dotenv'
import { jwtVerify } from 'jose'

dotenv.config()

// A throwaway secret so the check runs on a machine with no .env.
process.env.AUTH_SECRET ||= 'test-secret-that-is-definitely-long-enough-32'

const {
  hashPassword,
  verifyPassword,
  validateCredentials,
  startSession,
  endSession,
  assertSameOrigin,
  publicUser,
  AuthError,
} = await import('../api/_lib/auth.js')

let failures = 0
const check = (label, condition) => {
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures++
    console.log(`  FAIL  ${label}`)
  }
}

/** Minimal stand-in for a Vercel response object. */
function fakeRes() {
  const headers = {}
  return { headers, setHeader: (name, value) => (headers[name.toLowerCase()] = value) }
}

// ---------------------------------------------------------------- passwords
console.log('\nPasswords')

const hash = await hashPassword('correct horse battery staple')

check('hash is bcrypt, not the plaintext', hash.startsWith('$2') && !hash.includes('correct'))
check('correct password verifies', await verifyPassword('correct horse battery staple', hash))
check('wrong password is rejected', !(await verifyPassword('wrong password', hash)))
check(
  'the same password hashes differently each time (salted)',
  (await hashPassword('same')) !== (await hashPassword('same'))
)
// A miss must still do the bcrypt work, or response timing reveals which emails exist.
const started = process.hrtime.bigint()
await verifyPassword('anything', undefined)
const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6
check(`an unknown user still costs bcrypt time (${elapsedMs.toFixed(0)}ms, no timing leak)`, elapsedMs > 10)

// ---------------------------------------------------------------- validation
console.log('\nCredential validation')

const valid = { email: 'a@b.co', password: 'longenough1', displayName: 'Alex' }

check('a good registration passes', validateCredentials(valid, { isRegister: true }).length === 0)
check(
  'a malformed email is rejected',
  validateCredentials({ ...valid, email: 'not-an-email' }, { isRegister: true }).length > 0
)
check(
  'a 7-character password is rejected',
  validateCredentials({ ...valid, password: 'short7!' }, { isRegister: true }).length > 0
)
check(
  'a 300-character password is rejected (bcrypt truncates past 72 bytes)',
  validateCredentials({ ...valid, password: 'x'.repeat(300) }, { isRegister: true }).length > 0
)
check(
  'a missing name is rejected on register',
  validateCredentials({ ...valid, displayName: '  ' }, { isRegister: true }).length > 0
)
check('name is not required on login', validateCredentials({ email: 'a@b.co', password: 'longenough1' }).length === 0)

// ---------------------------------------------------------------- session cookie
console.log('\nSession cookie')

const user = { id: 42, email: 'a@b.co', display_name: 'Alex', created_at: new Date().toISOString() }
const res = fakeRes()
await startSession(res, user)

const cookie = res.headers['set-cookie']

check('cookie is set', Boolean(cookie))
check('cookie is HttpOnly (a script cannot read the session)', /HttpOnly/.test(cookie))
check('cookie is SameSite=Lax (the browser blocks cross-site POSTs)', /SameSite=Lax/.test(cookie))
check('cookie has a Max-Age', /Max-Age=\d+/.test(cookie))

const token = cookie.split(';')[0].split('=')[1]
const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET))

check('token identifies the right user', payload.sub === '42')
check('token carries no password hash', !JSON.stringify(payload).includes('$2'))
check('token expires', typeof payload.exp === 'number')

// A token signed with a different secret must not be accepted.
let tamperRejected = false
try {
  await jwtVerify(token, new TextEncoder().encode('a-completely-different-secret-value-32'))
} catch {
  tamperRejected = true
}
check('a token signed with another secret is rejected', tamperRejected)

const cleared = fakeRes()
endSession(cleared)
check('logout expires the cookie', /Max-Age=0/.test(cleared.headers['set-cookie']))

// ---------------------------------------------------------------- CSRF
console.log('\nCSRF (Origin check)')

const req = (method, origin, host = 'myrig.app') => ({
  method,
  headers: { ...(origin ? { origin } : {}), host },
})

const throws = (request) => {
  try {
    assertSameOrigin(request)
    return false
  } catch (err) {
    return err instanceof AuthError
  }
}

check('same-origin POST is allowed', !throws(req('POST', 'https://myrig.app')))
check('cross-origin POST is blocked', throws(req('POST', 'https://evil.example')))
check('cross-origin DELETE is blocked', throws(req('DELETE', 'https://evil.example')))
check('cross-origin GET is allowed (GET changes nothing)', !throws(req('GET', 'https://evil.example')))
check('POST with no Origin header is allowed (curl, tests)', !throws(req('POST', null)))

// ---------------------------------------------------------------- leakage
console.log('\nWhat reaches the browser')

const exposed = publicUser({ ...user, password_hash: hash })

check('publicUser never includes password_hash', !('password_hash' in exposed))
check('publicUser has no field containing a bcrypt hash', !JSON.stringify(exposed).includes('$2'))

console.log(failures === 0 ? '\nALL AUTH CHECKS PASSED' : `\n${failures} AUTH CHECK(S) FAILED`)
process.exit(failures ? 1 : 0)
