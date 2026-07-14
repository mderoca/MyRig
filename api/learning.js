/**
 * GET /api/learning
 *
 * The Learning Center cards, from the `learning_cards` table. Public.
 *
 * These are the same rows that produce the inline beginner notes next to
 * recommended parts - one place to edit an explanation, two places it appears.
 *
 * (This route replaced the old /api/parts. The store catalog now lives at
 * /api/products, which is the only place products are served from.)
 */

import { sql } from '../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from './_lib/catalog.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  try {
    assertDatabase()

    const cards = await sql`
      SELECT id, title, short_description, beginner_description, category
      FROM learning_cards
      ORDER BY id
    `

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')

    return res.status(200).json({ learningCards: cards })
  } catch (err) {
    const status = err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/learning]', err.message)
    return res.status(status).json({ error: err.message || 'Could not load the learning cards.' })
  }
}
