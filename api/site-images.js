/**
 * GET /api/site-images
 *
 * Public. Returns every configured site chrome image as `{ key: url }`. Small
 * table by design, so no filtering or pagination — the whole map is one query
 * and one cache line.
 *
 * Response: { images: { home_hero?: string, ... } }
 */

import { sql } from '../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from './_lib/catalog.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  try {
    assertDatabase()

    const rows = await sql`SELECT key, url FROM site_images`
    const images = Object.fromEntries(rows.map((row) => [row.key, row.url]))

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ images })
  } catch (err) {
    const status = err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/site-images]', err.message)
    return res.status(status).json({ error: err.message || 'Could not load site images.' })
  }
}
