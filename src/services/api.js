/**
 * The only place in the frontend that talks to the network.
 *
 * Every call goes to our own /api/* serverless routes. The browser never calls
 * RAWG or Neon directly - it has no key for either, by design.
 *
 * `credentials: 'same-origin'` is what carries the session cookie. The cookie is
 * httpOnly, so this file cannot read it, and neither can any script injected
 * into the page - which is the point.
 */

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
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
    const error = new Error(payload?.error || `Request failed (${response.status}).`)
    error.status = response.status
    throw error
  }

  return payload
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })

// ---------------------------------------------------------------- auth
export const register = (credentials) => post('/api/auth/register', credentials).then((r) => r.user)
export const login = (credentials) => post('/api/auth/login', credentials).then((r) => r.user)
export const logout = () => post('/api/auth/logout', {})
export const me = () => request('/api/auth/me').then((r) => r.user)

// ---------------------------------------------------------------- store
/** @param filters { category, kind, q, min, max, sort } - all optional */
export function getProducts(filters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value)
  }
  const query = params.toString()
  return request(`/api/products${query ? `?${query}` : ''}`)
}

// ---------------------------------------------------------------- games
export const searchGames = (query) =>
  request(`/api/games/search?q=${encodeURIComponent(query)}`).then((r) => r.games || [])

export const getGame = (id) => request(`/api/games/${encodeURIComponent(id)}`).then((r) => r.game)

/** "Can I Run It?" - what this game needs, and what it costs. */
export const canIRun = (gameId) => post('/api/can-i-run', { gameId })

// ---------------------------------------------------------------- planner
export const generateSetup = (quiz) => post('/api/recommend', quiz)

export const getLearningCards = () => request('/api/learning').then((r) => r.learningCards || [])

// ---------------------------------------------------------------- account data
export const listBuilds = () => request('/api/builds').then((r) => r.builds || [])
export const saveBuild = (build) => post('/api/builds', build).then((r) => r.build)
export const deleteBuild = (id) =>
  request(`/api/builds?id=${encodeURIComponent(id)}`, { method: 'DELETE' })

export const listWishlist = () => request('/api/wishlist').then((r) => r.items || [])
export const addToWishlist = (productId) => post('/api/wishlist', { productId })
export const removeFromWishlist = (productId) =>
  request(`/api/wishlist?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' })

export const listOrders = () => request('/api/orders').then((r) => r.orders || [])
/** @param items [{ productId, quantity }] - prices are decided by the server, not us. */
export const placeOrder = (items) => post('/api/orders', { items }).then((r) => r.order)
