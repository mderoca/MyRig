/**
 * Supabase Postgres connection helper.
 *
 * Uses `postgres` (porsager) with the tagged-template `sql`...`` API. Callers
 * remain identical to the previous Neon setup; runtime-built statements go
 * through `sql.unsafe(str, params?)`.
 *
 * Two things that are not obvious:
 *
 *   - `prepare: false` and `fetch_types: false` are BOTH required when talking
 *     to Supavisor's transaction pooler (port 6543). Server-side prepared
 *     statements and the driver's bootstrap type-discovery query both use
 *     features the pooler drops between requests, and get silently hung.
 *
 *   - `fetch_types: false` also throws away the result parsers the driver
 *     would have discovered, so json/jsonb columns come back as raw strings
 *     and text[] columns as '{a,b}' literals. That broke Saved Builds (the
 *     page calls .filter on recommended_items) and silently zeroed the
 *     engine's goal/style scoring (has() requires a real array). The `types`
 *     block below re-registers parsers for the OIDs this schema actually
 *     uses; if a new column type is added, its OID must be added there too.
 *
 *   - The client is cached on `globalThis` on purpose. Vite's dev SSR reloads
 *     this module on every save (`ssrLoadModule`), which would otherwise create
 *     a new postgres client per reload; the old client's socket keeps receiving
 *     responses while the new client waits, so every DB query hangs forever.
 *     Caching on globalThis makes reloads reuse the same client. In Vercel
 *     serverless production each cold start has its own globalThis, so this is
 *     a no-op there.
 */

import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

/** True when DATABASE_URL is configured. Routes use this to fail with a clear message. */
export const hasDatabase = Boolean(connectionString)

/**
 * Parses a Postgres array literal ('{a,b,"c d"}') into a string array.
 * Handles the quoting/escaping our slug-like values can produce; nested
 * arrays are not handled because no column here uses them.
 */
export function parseTextArray(literal) {
  if (typeof literal !== 'string' || literal[0] !== '{') return []
  const inner = literal.slice(1, -1)
  if (!inner) return []

  const out = []
  let current = ''
  let quoted = false
  let inQuotes = false

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (inQuotes) {
      if (ch === '\\') current += inner[++i]
      else if (ch === '"') inQuotes = false
      else current += ch
    } else if (ch === '"') {
      inQuotes = true
      quoted = true
    } else if (ch === ',') {
      out.push(quoted || current !== 'NULL' ? current : null)
      current = ''
      quoted = false
    } else {
      current += ch
    }
  }
  out.push(quoted || current !== 'NULL' ? current : null)
  return out
}

function createClient() {
  return postgres(connectionString, {
    ssl: 'require',
    max: 1,
    prepare: false,
    fetch_types: false,
    types: {
      json: { to: 114, from: [114, 3802], serialize: JSON.stringify, parse: JSON.parse },
      // 1009 = text[], 1015 = varchar[]
      textArray: {
        to: 1009,
        from: [1009, 1015],
        serialize: (v) => v,
        parse: parseTextArray,
      },
    },
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    onnotice: () => {},
    // Set on every connection: no single query is allowed to run longer than
    // 15 seconds. Without this, one wedged query on a `max: 1` client blocks
    // every other request forever — as it did the first time this app went
    // down after a big Storage upload held the process while PG queued behind.
    connection: {
      statement_timeout: '15000',
    },
  })
}

export const sql = hasDatabase
  ? (globalThis.__myrigSql ??= createClient())
  : () => {
      throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and add your Supabase connection string, then run `npm run db:setup`.'
      )
    }
