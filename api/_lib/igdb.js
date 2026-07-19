/**
 * Server-side IGDB client.
 *
 * IGDB is owned by Twitch, so authentication is Twitch's OAuth client-credentials
 * flow: exchange a client id + secret for a bearer token, then send that token
 * plus the client id on every request.
 *
 * SECURITY: IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are read from the environment
 * here, inside a serverless function. Neither is ever sent to the browser or
 * included in the bundle. The frontend only calls our own /api/games/* routes,
 * which call IGDB on its behalf. Do not import this file from anything under /src.
 *
 * Why IGDB and not Steam: Steam's API only covers what Steam sells. It returns
 * nothing for Valorant or Fortnite, and only spin-offs for Minecraft. IGDB is a
 * database rather than a storefront, so it has all of them.
 *
 * Why the shape below matches the old RAWG client exactly: the recommendation
 * engine reads `genres` and `tags` and nothing else about a game
 * (`readGameSignal` in engine.js). Keeping `normalizeGame`'s output identical
 * means the engine, the routes and the frontend did not change when the provider
 * did.
 */

const IGDB_BASE = 'https://api.igdb.com/v4'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'

export class IgdbError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

function credentials() {
  const clientId = process.env.IGDB_CLIENT_ID
  const clientSecret = process.env.IGDB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new IgdbError(
      'IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are not set on the server. ' +
        'Create an app at https://dev.twitch.tv/console/apps, then add both to .env ' +
        'locally, or to the Vercel project environment variables.',
      503
    )
  }

  return { clientId, clientSecret }
}

/**
 * Cached app access token.
 *
 * Module scope, so it survives for the life of a warm serverless instance and a
 * cold start just fetches a new one. Tokens last ~60 days, so this is at most one
 * extra request per instance — not worth a database table. Do NOT log the token.
 */
let cachedToken = null

async function accessToken({ force = false } = {}) {
  const { clientId, clientSecret } = credentials()

  // 60s of slack so a token cannot expire between this check and the request.
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value
  }

  const url = new URL(TWITCH_TOKEN_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('grant_type', 'client_credentials')

  const response = await fetch(url, { method: 'POST' })

  if (!response.ok) {
    // Never echo the URL — it carries the client secret in its query string.
    throw new IgdbError(
      response.status === 400 || response.status === 401 || response.status === 403
        ? 'Twitch rejected the IGDB credentials. Check IGDB_CLIENT_ID and IGDB_CLIENT_SECRET.'
        : `Could not get an IGDB access token (status ${response.status}).`,
      response.status === 400 || response.status === 401 || response.status === 403 ? 503 : 502
    )
  }

  const data = await response.json()

  if (!data?.access_token) {
    throw new IgdbError('Twitch returned no access token.', 502)
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  }

  return cachedToken.value
}

/**
 * Run an APIcalypse query against IGDB.
 *
 * Retries once on a 401: a cached token can be revoked or invalidated upstream
 * before its stated expiry, and the fix is simply to fetch a fresh one.
 */
async function igdbFetch(endpoint, query, { retryOnAuthFailure = true } = {}) {
  const { clientId } = credentials()
  const token = await accessToken()

  const response = await fetch(`${IGDB_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query,
  })

  if (response.status === 401 && retryOnAuthFailure) {
    await accessToken({ force: true })
    return igdbFetch(endpoint, query, { retryOnAuthFailure: false })
  }

  if (!response.ok) {
    throw new IgdbError(
      response.status === 401 || response.status === 403
        ? 'IGDB rejected the credentials.'
        : response.status === 429
          ? 'IGDB is rate limiting us. Try again in a moment.'
          : `IGDB request failed (status ${response.status}).`,
      response.status === 401 || response.status === 403 ? 503 : 502
    )
  }

  return response.json()
}

/**
 * Escape a user-supplied string before it goes inside an APIcalypse `search "..."`.
 *
 * SECURITY: APIcalypse is a query language, so an unescaped double quote lets a
 * search term break out of the string and change the query — the same class of
 * bug as SQL injection. Backslashes are escaped first, otherwise escaping the
 * quotes would leave a trailing backslash that escapes the closing quote.
 * Newlines end a clause in APIcalypse, so they go too.
 */
function escapeQuery(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, ' ')
}

/** Flatten IGDB's nested shapes ({name: 'Shooter'}) down to plain strings. */
const names = (list, limit = 8) =>
  (list || [])
    .map((entry) => entry?.name)
    .filter(Boolean)
    .slice(0, limit)

/**
 * IGDB image urls arrive protocol-relative and thumbnail-sized:
 *   //images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg
 * The frontend wants something big enough to show, over https.
 */
function imageUrl(cover, size = 't_cover_big') {
  if (!cover?.url) return null
  return `https:${cover.url}`.replace('/t_thumb/', `/${size}/`)
}

/** The shape the frontend and the recommendation engine actually consume. */
function normalizeGame(game) {
  return {
    id: game.id,
    name: game.name,
    image: imageUrl(game.cover),
    // IGDB rates 0-100; RAWG rated 0-5 and the UI renders "★ {{ rating }}".
    // Convert rather than change the UI.
    rating: typeof game.rating === 'number' ? Math.round((game.rating / 20) * 10) / 10 : null,
    released: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
    genres: names(game.genres, 5),
    platforms: names(game.platforms, 6),
    // RAWG's `tags` are the engine's richest signal ("open world", "story rich",
    // "competitive"). IGDB splits that across themes and keywords, so both feed
    // `tags`. Themes come first — they are curated, keywords are user-supplied
    // and noisier.
    tags: [...names(game.themes, 4), ...names(game.keywords, 6)].slice(0, 8),
  }
}

/** Fields every query needs; IGDB returns only what you ask for. */
const GAME_FIELDS =
  'fields id, name, cover.url, rating, aggregated_rating, first_release_date, ' +
  'genres.name, themes.name, keywords.name, platforms.name, summary;'

/**
 * Rank the closest name match first.
 *
 * IGDB's `search` does not order by relevance the way RAWG's did: searching
 * "valorant" puts "Grit & Valor: 1949" above Valorant, and "minecraft" puts
 * "Minecraft Tower Defence" above Minecraft. Since the user picks from this list
 * and the pick drives the whole recommendation, the obvious match has to be at
 * the top. Ties keep IGDB's original order, which is roughly by popularity.
 */
function byRelevance(query) {
  const wanted = query.trim().toLowerCase()

  const rank = (game) => {
    const name = String(game.name || '').toLowerCase()
    if (name === wanted) return 0
    if (name.startsWith(`${wanted}:`) || name.startsWith(`${wanted} `)) return 1
    if (name.startsWith(wanted)) return 2
    if (name.includes(wanted)) return 3
    return 4
  }

  return (a, b) => rank(a) - rank(b)
}

/** GET /api/games/search - search IGDB by name. */
export async function searchGames(query, { pageSize = 12 } = {}) {
  // Keep real games; drop DLC, mods, packs, episodes and updates.
  //   0 main game   8 remake   9 remaster   10 expanded game   11 port
  // Do NOT narrow this to 0 alone: Minecraft's canonical entry is a PORT (11),
  // as is Fortnite's, so an allow-list of just main-game loses both.
  // version_parent = null drops alternate editions of the same game.
  //
  // NOTE: this field was called `category` until IGDB renamed it. An unknown
  // field in a `where` clause does not error — IGDB just returns [] — so if
  // search silently stops finding anything, suspect a renamed field here first.
  const games = await igdbFetch(
    '/games',
    `search "${escapeQuery(query)}"; ${GAME_FIELDS} ` +
      `where game_type = (0,8,9,10,11) & version_parent = null; limit ${Number(pageSize) || 12};`
  )

  // IGDB lists some games twice under one name (Fortnite appears as both a main
  // game and a port). Two identical rows in a picker is just confusing, so keep
  // whichever ranked better.
  const seen = new Set()
  return (games || [])
    .sort(byRelevance(query))
    .filter((game) => {
      const key = String(game.name || '').toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(normalizeGame)
}

/** GET /api/games/:id - full detail for one game, plus a few screenshots. */
export async function getGame(id) {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new IgdbError('That is not a valid game id.', 400)
  }

  const [game] = await igdbFetch(
    '/games',
    `${GAME_FIELDS.slice(0, -1)}, screenshots.url; where id = ${numericId}; limit 1;`
  )

  if (!game) {
    throw new IgdbError('No game found with that id.', 404)
  }

  return {
    ...normalizeGame(game),
    description: game.summary || '',
    // IGDB's aggregated_rating is the critic score, which is what metacritic was.
    metacritic: typeof game.aggregated_rating === 'number' ? Math.round(game.aggregated_rating) : null,
    screenshots: (game.screenshots || [])
      .map((shot) => imageUrl(shot, 't_screenshot_big'))
      .filter(Boolean)
      .slice(0, 6),
  }
}
