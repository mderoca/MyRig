/**
 * Server-side RAWG client.
 *
 * SECURITY: RAWG_API_KEY is read from the environment here, inside a serverless
 * function. It is never sent to the browser and never appears in the bundle.
 * The frontend only ever calls our own /api/games/* routes, which call RAWG on
 * its behalf. Do not import this file from anything under /src.
 */

const RAWG_BASE = 'https://api.rawg.io/api'

export class RawgError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

function apiKey() {
  const key = process.env.RAWG_API_KEY
  if (!key) {
    throw new RawgError(
      'RAWG_API_KEY is not set on the server. Add it to .env locally, or to the Vercel project environment variables.',
      500
    )
  }
  return key
}

async function rawgFetch(path, params = {}) {
  const url = new URL(`${RAWG_BASE}${path}`)
  url.searchParams.set('key', apiKey())
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const response = await fetch(url, { headers: { Accept: 'application/json' } })

  if (!response.ok) {
    // Deliberately vague to the client - never echo the upstream URL, it has the key in it.
    throw new RawgError(
      response.status === 401
        ? 'RAWG rejected the API key.'
        : `RAWG request failed (status ${response.status}).`,
      response.status === 401 ? 500 : 502
    )
  }

  return response.json()
}

/** Flatten RAWG's nested shapes ({name: 'Shooter'}) down to plain strings. */
const names = (list, limit = 8) =>
  (list || [])
    .map((entry) => entry?.name)
    .filter(Boolean)
    .slice(0, limit)

/** The shape the frontend and the recommendation engine actually consume. */
function normalizeGame(game) {
  return {
    id: game.id,
    name: game.name,
    image: game.background_image || null,
    rating: game.rating ?? null,
    released: game.released || null,
    genres: names(game.genres, 5),
    platforms: names(game.parent_platforms?.map((p) => p.platform) || game.platforms?.map((p) => p.platform), 6),
    tags: names(game.tags, 8),
  }
}

/** GET /api/games/search - search RAWG by name. */
export async function searchGames(query, { pageSize = 12 } = {}) {
  const data = await rawgFetch('/games', {
    search: query,
    page_size: pageSize,
    search_precise: true,
  })

  return (data.results || []).map(normalizeGame)
}

/** GET /api/games/:id - full detail for one game, plus a few screenshots. */
export async function getGame(id) {
  const game = await rawgFetch(`/games/${encodeURIComponent(id)}`)

  let screenshots = []
  try {
    const shots = await rawgFetch(`/games/${encodeURIComponent(id)}/screenshots`)
    screenshots = (shots.results || []).map((s) => s.image).filter(Boolean).slice(0, 6)
  } catch {
    // Screenshots are a nice-to-have. A game with no screenshots is not an error.
  }

  return {
    ...normalizeGame(game),
    description: game.description_raw || '',
    metacritic: game.metacritic ?? null,
    screenshots,
  }
}
