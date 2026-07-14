/**
 * GET /api/products
 *
 * The store catalog. Public - no sign-in needed to browse.
 *
 * Query params (all optional):
 *   category=gpu        one category, or omit for all
 *   kind=part|accessory
 *   q=rtx               free-text search on the name
 *   min=100&max=500     price range
 *   sort=price_asc | price_desc | name | tier   (default: name)
 *
 * Response: { products[], categories[], count }
 *
 * SECURITY: every value below is passed to Postgres as a bound parameter via the
 * sql`` tagged template - none of it is concatenated into the query string. A
 * search for `'; DROP TABLE users; --` is just a search for a product with a
 * very silly name.
 */

import { sql } from '../db/connection.js'
import { assertDatabase, DatabaseNotConfigured, withNumericPrice } from './_lib/catalog.js'

const SORTS = ['price_asc', 'price_desc', 'name', 'tier']

/** Reject unknown values rather than repairing them - see secure-coding rule 1. */
function readFilters(query) {
  const category = typeof query.category === 'string' ? query.category.slice(0, 40) : null
  const kind = query.kind === 'part' || query.kind === 'accessory' ? query.kind : null
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 80) : ''

  const min = Number(query.min)
  const max = Number(query.max)

  const sort = SORTS.includes(query.sort) ? query.sort : 'name'

  return {
    category: category || null,
    kind,
    search: search || null,
    min: Number.isFinite(min) && min >= 0 ? min : null,
    max: Number.isFinite(max) && max > 0 ? max : null,
    sort,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  try {
    assertDatabase()

    const { category, kind, search, min, max, sort } = readFilters(req.query)

    // Each filter is applied as "param IS NULL OR <test>", so one query handles
    // every combination without building SQL by hand.
    const rows = await sql`
      SELECT id, name, category, kind, price, tier, best_for, styles, reason, in_stock
      FROM products
      WHERE (${category}::TEXT IS NULL OR category = ${category})
        AND (${kind}::TEXT IS NULL OR kind = ${kind})
        AND (${search}::TEXT IS NULL OR name ILIKE '%' || ${search} || '%')
        AND (${min}::NUMERIC IS NULL OR price >= ${min})
        AND (${max}::NUMERIC IS NULL OR price <= ${max})
      ORDER BY
        CASE WHEN ${sort} = 'price_asc'  THEN price END ASC,
        CASE WHEN ${sort} = 'price_desc' THEN price END DESC,
        CASE WHEN ${sort} = 'tier' THEN
          CASE tier WHEN 'ultra' THEN 4 WHEN 'high' THEN 3 WHEN 'mid' THEN 2 WHEN 'budget' THEN 1 ELSE 0 END
        END DESC,
        name ASC
    `

    // The category list powers the store's filter sidebar.
    const categories = await sql`
      SELECT category, kind, COUNT(*)::INT AS count
      FROM products
      GROUP BY category, kind
      ORDER BY kind, category
    `

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')

    const products = rows.map(withNumericPrice)
    return res.status(200).json({ products, categories, count: products.length })
  } catch (err) {
    const status = err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/products]', err.message)
    return res.status(status).json({ error: err.message || 'Could not load the store.' })
  }
}
