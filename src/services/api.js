/**
 * The only place in the frontend that talks to the network.
 *
 * Every call goes to our own /api/* serverless routes. The browser never calls
 * RAWG or Neon directly - it has no key for either, by design.
 */

/** Calls an API route and turns a non-2xx response into a thrown Error with the server's message. */
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON response (e.g. an HTML error page).
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status}).`)
  }

  return payload
}

/** GET /api/games/search?q=... */
export function searchGames(query) {
  return request(`/api/games/search?q=${encodeURIComponent(query)}`).then((r) => r.games || [])
}

/** GET /api/games/:id */
export function getGame(id) {
  return request(`/api/games/${encodeURIComponent(id)}`).then((r) => r.game)
}

/** GET /api/parts - parts, accessories, learning cards, upgrade rules. */
export function getCatalog() {
  return request('/api/parts')
}

/** POST /api/recommend - runs the quiz answers through the recommendation engine. */
export function generateSetup(quiz) {
  return request('/api/recommend', {
    method: 'POST',
    body: JSON.stringify(quiz),
  })
}

/** GET /api/builds?userId=... */
export function listBuilds(userId) {
  return request(`/api/builds?userId=${encodeURIComponent(userId)}`).then((r) => r.builds || [])
}

/** POST /api/builds */
export function saveBuild(build) {
  return request('/api/builds', {
    method: 'POST',
    body: JSON.stringify(build),
  }).then((r) => r.build)
}

/** DELETE /api/builds?id=...&userId=... */
export function deleteBuild(id, userId) {
  return request(
    `/api/builds?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
}
