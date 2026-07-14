/**
 * Neon Postgres connection helper.
 *
 * Uses @neondatabase/serverless, which talks to Neon over HTTP. That matters:
 * a normal TCP Postgres pool does not survive in a serverless function, but an
 * HTTP query does, so this works on Vercel with no connection pooling problems.
 *
 * Usage in an API route:
 *
 *   import { sql } from '../db/connection.js'
 *   const rows = await sql`SELECT * FROM parts WHERE category = ${category}`
 *
 * Values interpolated into the template literal are sent as bound parameters,
 * not string-concatenated, so this is safe against SQL injection.
 */

import { neon } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_URL

/** True when DATABASE_URL is configured. Routes use this to fail with a clear message. */
export const hasDatabase = Boolean(connectionString)

/**
 * Tagged-template SQL client. Throws a readable error instead of a cryptic one
 * if someone runs the app before setting DATABASE_URL.
 */
export const sql = hasDatabase
  ? neon(connectionString)
  : () => {
      throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string, then run `npm run db:setup`.'
      )
    }
