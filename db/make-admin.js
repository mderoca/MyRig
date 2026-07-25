/**
 * Grant a registered user the admin role.
 *
 *   npm run db:make-admin -- someone@example.com
 *
 * The user must already exist (i.e. have registered through the app). Comparison
 * is case-insensitive because emails are stored lower-cased.
 */

import dotenv from 'dotenv'

dotenv.config()

const email = process.argv[2]

if (!email) {
  console.error(
    '\nUsage:  npm run db:make-admin -- <email>\n' +
      'The user must have registered in the app first.\n'
  )
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('\nDATABASE_URL is not set. Configure .env first.\n')
  process.exit(1)
}

const { sql } = await import('./connection.js')

const normalized = email.trim().toLowerCase()

const rows = await sql`
  UPDATE users
     SET role = 'admin'
   WHERE LOWER(email) = ${normalized}
   RETURNING id, email, role
`

if (rows.length === 0) {
  console.error(
    `\nNo user with email '${normalized}'.\n` +
      'Register in the app first, then re-run this command.\n'
  )
  await sql.end()
  process.exit(1)
}

console.log(`\nPromoted ${rows[0].email} (id ${rows[0].id}) to admin.\n`)
await sql.end()
