/**
 * /api/wishlist - the signed-in user's wishlist.
 *
 *   GET    /api/wishlist            -> their wishlist, with the product joined in
 *   POST   /api/wishlist            -> { productId }  add
 *   DELETE /api/wishlist?productId= -> remove
 *
 * SECURITY: every query is scoped by the id from the session cookie, never by
 * an id from the request. There is no way to ask for, or delete, another user's
 * wishlist - the user_id is not an input.
 */

import { sql } from '../db/connection.js'
import { assertDatabase, DatabaseNotConfigured, withNumericPrice } from './_lib/catalog.js'
import { AuthError, assertSameOrigin, requireUser } from './_lib/auth.js'

const productId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function list(user, res) {
  const rows = await sql`
    SELECT p.id, p.name, p.category, p.kind, p.price, p.tier, p.reason, p.in_stock,
           w.created_at AS added_at
    FROM wishlist w
    JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ${user.id}
    ORDER BY w.created_at DESC
  `
  return res.status(200).json({ items: rows.map(withNumericPrice) })
}

async function add(user, req, res) {
  const id = productId(req.body?.productId)
  if (!id) return res.status(400).json({ error: 'A valid productId is required.' })

  // ON CONFLICT: adding something twice is a no-op, not an error. The UNIQUE
  // constraint on (user_id, product_id) is what makes that safe.
  const [row] = await sql`
    INSERT INTO wishlist (user_id, product_id)
    VALUES (${user.id}, ${id})
    ON CONFLICT (user_id, product_id) DO NOTHING
    RETURNING id
  `

  if (!row) return res.status(200).json({ ok: true, alreadyThere: true })

  return res.status(201).json({ ok: true })
}

async function remove(user, req, res) {
  const id = productId(req.query.productId)
  if (!id) return res.status(400).json({ error: 'A valid productId is required.' })

  const deleted = await sql`
    DELETE FROM wishlist
    WHERE user_id = ${user.id} AND product_id = ${id}
    RETURNING id
  `

  if (!deleted.length) {
    return res.status(404).json({ error: 'That product is not on your wishlist.' })
  }

  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  try {
    assertDatabase()
    assertSameOrigin(req)

    const user = await requireUser(req)

    switch (req.method) {
      case 'GET':
        return await list(user, res)
      case 'POST':
        return await add(user, req, res)
      case 'DELETE':
        return await remove(user, req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed. Use GET, POST or DELETE.' })
    }
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/wishlist]', status, err.message)
    return res
      .status(status)
      .json({ error: status === 500 ? 'Your wishlist is unavailable right now.' : err.message })
  }
}
