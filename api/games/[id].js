/**
 * GET /api/games/:id
 *
 * Optional detail route. Returns the full RAWG record for one game -
 * description, genres, platforms, tags and screenshots.
 *
 * Response: { game: { ..., description, screenshots[] } }
 */

import { getGame, RawgError } from '../_lib/rawg.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  const id = String(req.query.id || '').trim()

  if (!id) {
    return res.status(400).json({ error: 'A game id is required.' })
  }

  try {
    const game = await getGame(id)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

    return res.status(200).json({ game })
  } catch (err) {
    const status = err instanceof RawgError ? err.status : 500
    console.error('[api/games/:id]', err.message)
    return res.status(status).json({ error: err.message || 'Could not load that game.' })
  }
}
