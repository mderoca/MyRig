/**
 * /api/orders - simulated checkout and order history.
 *
 *   GET  /api/orders  -> the signed-in user's orders, newest first, with line items
 *   POST /api/orders  -> { items: [{ productId, quantity }] }   place an order
 *
 * Checkout is SIMULATED. There is no payment provider and no card details -
 * MyRig never sees, transmits or stores any. Placing an order writes rows and
 * nothing else.
 *
 * SECURITY, and this is the important one:
 *
 *   **Prices come from the database, never from the request.** The client sends
 *   only product ids and quantities. If it sent prices, anyone could POST
 *   `{"productId": 8, "price": 0.01}` and buy an RTX for a cent. The server
 *   looks every product up and computes the total itself.
 *
 * Orders are scoped to the user id in the session cookie, never to an id in the
 * request, so nobody can read anyone else's order history.
 */

import { sql } from '../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from './_lib/catalog.js'
import { AuthError, assertSameOrigin, requireUser } from './_lib/auth.js'

const MAX_LINE_ITEMS = 40
const MAX_QUANTITY = 10

/** MR7899753-0605 - the format the Orders page shows. */
function makeOrderNumber() {
  const stamp = Date.now().toString().slice(-7)
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `MR${stamp}-${suffix}`
}

// ---------------------------------------------------------------- GET
async function list(user, res) {
  const orders = await sql`
    SELECT id, order_number, status, total, created_at
    FROM orders
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `

  if (!orders.length) return res.status(200).json({ orders: [] })

  const items = await sql`
    SELECT order_id, product_id, name, category, price, quantity
    FROM order_items
    WHERE order_id = ANY(${orders.map((o) => o.id)})
    ORDER BY id
  `

  const byOrder = new Map(orders.map((o) => [o.id, []]))
  for (const item of items) {
    byOrder.get(item.order_id)?.push({ ...item, price: Number(item.price) })
  }

  return res.status(200).json({
    orders: orders.map((order) => ({
      ...order,
      total: Number(order.total),
      items: byOrder.get(order.id) || [],
    })),
  })
}

// ---------------------------------------------------------------- POST
async function place(user, req, res) {
  const lines = req.body?.items

  if (!Array.isArray(lines) || !lines.length) {
    return res.status(400).json({ error: 'Your cart is empty.' })
  }
  if (lines.length > MAX_LINE_ITEMS) {
    return res.status(400).json({ error: `An order can hold at most ${MAX_LINE_ITEMS} lines.` })
  }

  // Collapse duplicates and validate. Anything malformed is rejected, not repaired.
  const quantities = new Map()
  for (const line of lines) {
    const id = Number(line?.productId)
    const quantity = Number(line?.quantity)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Every line needs a valid productId.' })
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}.` })
    }

    quantities.set(id, Math.min(MAX_QUANTITY, (quantities.get(id) || 0) + quantity))
  }

  // THE prices. Straight from the database - whatever the client claimed is ignored.
  const products = await sql`
    SELECT id, name, category, price, in_stock
    FROM products
    WHERE id = ANY(${[...quantities.keys()]})
  `

  if (products.length !== quantities.size) {
    return res.status(400).json({ error: 'Your cart contains a product that no longer exists.' })
  }

  const outOfStock = products.filter((p) => !p.in_stock)
  if (outOfStock.length) {
    return res
      .status(409)
      .json({ error: `Out of stock: ${outOfStock.map((p) => p.name).join(', ')}.` })
  }

  const items = products.map((product) => ({
    productId: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    quantity: quantities.get(product.id),
  }))

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const [order] = await sql`
    INSERT INTO orders (user_id, order_number, status, total)
    VALUES (${user.id}, ${makeOrderNumber()}, 'Processing', ${total})
    RETURNING id, order_number, status, total, created_at
  `

  try {
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, name, category, price, quantity)
        VALUES (${order.id}, ${item.productId}, ${item.name}, ${item.category},
                ${item.price}, ${item.quantity})
      `
    }
  } catch (err) {
    // The Neon HTTP driver has no multi-statement transaction, so if the line
    // items fail we remove the order rather than leave an empty one behind.
    await sql`DELETE FROM orders WHERE id = ${order.id}`
    throw err
  }

  return res.status(201).json({
    order: { ...order, total: Number(order.total), items },
  })
}

// ---------------------------------------------------------------- router
export default async function handler(req, res) {
  try {
    assertDatabase()
    assertSameOrigin(req)

    const user = await requireUser(req)

    switch (req.method) {
      case 'GET':
        return await list(user, res)
      case 'POST':
        return await place(user, req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
    }
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/orders]', status, err.message)
    return res
      .status(status)
      .json({ error: status === 500 ? 'Your orders are unavailable right now.' : err.message })
  }
}
