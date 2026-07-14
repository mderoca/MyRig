/**
 * GET /api/parts
 *
 * Returns the whole catalog from Neon in one call: parts, accessories,
 * learning cards and upgrade rules. The Learning Center page reads the
 * learning cards from here; the rest is used for display and debugging.
 *
 * Response: { parts[], accessories[], learningCards[], upgradeRules[] }
 */

import { loadCatalog, DatabaseNotConfigured } from './_lib/catalog.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  try {
    const catalog = await loadCatalog()

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')

    return res.status(200).json(catalog)
  } catch (err) {
    const status = err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/parts]', err.message)
    return res.status(status).json({ error: err.message || 'Could not load the catalog.' })
  }
}
