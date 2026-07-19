/**
 * One-shot database setup against Neon.
 *
 *   npm run db:setup
 *
 * Creates the tables from schema.sql (dropping them first if they exist), then
 * seeds the catalog from catalog.js.
 *
 * WARNING: schema.sql DROPs every table, including users, orders and
 * saved_builds. Running this wipes all accounts and all order history. That is
 * fine for a demo. Do not run it against anything you want to keep.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

const here = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error(
    '\nDATABASE_URL is not set.\n' +
      'Copy .env.example to .env and paste your Neon connection string, then try again.\n'
  )
  process.exit(1)
}

// Imported after the env check so connection.js sees DATABASE_URL.
const { sql } = await import('./connection.js')
const { seedCatalog } = await import('./seed-catalog.js')

/**
 * Refuse to destroy accounts silently.
 *
 * This script DROPs every table. On a fresh database that is exactly right; on a
 * database someone has registered against, it wipes their login with no warning
 * — which is precisely how a working registration looks broken afterwards.
 *
 * So: count what would be lost first. If anything would, stop and say so, unless
 * --force was passed. A brand new database has no tables at all, which throws,
 * and that is the "nothing to lose, carry on" case.
 */
async function assertSafeToDrop() {
  let counts
  try {
    ;[counts] = await sql`
      SELECT (SELECT COUNT(*)::INT FROM users)        AS users,
             (SELECT COUNT(*)::INT FROM orders)       AS orders,
             (SELECT COUNT(*)::INT FROM saved_builds) AS builds
    `
  } catch {
    return // No tables yet - fresh database, nothing to protect.
  }

  const atRisk = counts.users + counts.orders + counts.builds
  if (atRisk === 0) return

  if (process.argv.includes('--force')) {
    console.log(
      `\nWARNING: --force given. Destroying ${counts.users} user account(s), ` +
        `${counts.orders} order(s) and ${counts.builds} saved build(s).\n`
    )
    return
  }

  console.error(
    `\nSTOPPED. This would delete real data:\n\n` +
      `    ${counts.users} user account(s)\n` +
      `    ${counts.orders} order(s)\n` +
      `    ${counts.builds} saved build(s)\n\n` +
      `db:setup DROPs every table. You almost certainly want:\n\n` +
      `    npm run db:reseed      reloads the catalog, keeps accounts and history\n\n` +
      `Only db/schema.sql changes need a full rebuild. If this really is one:\n\n` +
      `    npm run db:setup -- --force\n`
  )
  process.exit(1)
}

await assertSafeToDrop()

/**
 * Split schema.sql into individual statements.
 *
 * Comments are stripped BEFORE splitting, not after. Splitting first breaks on
 * `DROP TABLE IF EXISTS parts;   -- superseded by products`, where the semicolon
 * is followed by a trailing comment rather than end-of-line — everything after
 * it then arrives as one chunk and Neon rejects it with "cannot insert multiple
 * commands into a prepared statement".
 *
 * Split on /\r?\n/, not '\n': on a CRLF checkout every line would otherwise keep
 * its trailing \r, and JS `.` does not match \r — so `/--.*$/` matches nothing
 * and no comment is stripped at all.
 *
 * Caveat: this treats `--` as a comment everywhere, so a `--` inside a string
 * literal would be mangled. schema.sql contains none. Keep it that way.
 */
function statementsFrom(sqlText) {
  return sqlText
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

// Note: `sql` is a tagged-template function. Called directly with a query string
// and a parameter array it runs an ordinary parameterized query — which is what
// this file needs, since the statements are built at runtime rather than written
// as literals. There is no `sql.query()` on @neondatabase/serverless 0.x.
console.log('Applying schema...')
for (const statement of statementsFrom(readFileSync(join(here, 'schema.sql'), 'utf8'))) {
  await sql(statement)
}

const counts = await seedCatalog(sql)

console.log(
  `\nDone. Seeded ${counts.products} products, ${counts.learningCards} learning cards, ` +
    `${counts.upgradeRules} upgrade rules.\n` +
    `Register an account in the app to create your first user.\n` +
    `\nNext time you only change db/catalog.js, run 'npm run db:reseed' instead -\n` +
    `it reloads the catalog without dropping accounts.\n`
)
