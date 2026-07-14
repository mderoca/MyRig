/**
 * GET /api/games/search?q=valorant
 *
 * Searches the RAWG Video Games API and returns simplified game records.
 * The browser never talks to RAWG directly - this route holds the API key.
 *
 * Response: { games: [{ id, name, image, rating, genres, platforms, tags }] }
 */

import { searchGames, RawgError } from '../_lib/rawg.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  const query = String(req.query.q || '').trim()

  if (query.length < 2) {
    return res.status(400).json({ error: 'Provide a search term of at least 2 characters.' })
  }

  try {
    const games = await searchGames(query.slice(0, 100))

    // Search results change rarely - let the CDN hold them briefly.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

    return res.status(200).json({ query, count: games.length, games })
  } catch (err) {
    const status = err instanceof RawgError ? err.status : 500
    console.error('[api/games/search]', err.message)
    return res.status(status).json({ error: err.message || 'Game search failed.' })
  }
}
