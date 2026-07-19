/**
 * Reload the catalog WITHOUT touching accounts.
 *
 *   npm run db:reseed
 *
 * This is the one to run after editing db/catalog.js. It replaces products,
 * learning cards and upgrade rules, and leaves users, orders, wishlists and
 * saved builds alone.
 *
 * Use `npm run db:setup` instead only when db/schema.sql itself changed - a new
 * column or table. That one drops everything, accounts included.
 *
 * WHY `DELETE` AND NOT `TRUNCATE`:
 *
 *   `products` is referenced by `wishlist` and `order_items`, so Postgres will
 *   not TRUNCATE it without CASCADE - and TRUNCATE ... CASCADE empties those
 *   referencing tables COMPLETELY. That would wipe every order line item in the
 *   database, which is exactly the kind of quiet data loss this script exists to
 *   prevent.
 *
 *   DELETE respects the foreign keys as declared in schema.sql instead:
 *     wishlist.product_id     ON DELETE CASCADE  -> stale wishlist rows go, correctly
 *     order_items.product_id  ON DELETE SET NULL -> order HISTORY SURVIVES, because
 *                                                   line items copy name and price
 *                                                   at time of order
 *
 *   So a past order still shows what was actually paid, even though the product
 *   row it pointed at has been replaced. That is the whole reason those columns
 *   are duplicated on order_items.
 */

import dotenv from 'dotenv'

dotenv.config()

if (!process.env.DATABASE_URL) {
  console.error(
    '\nDATABASE_URL is not set.\n' +
      'Copy .env.example to .env and paste your Neon connection string, then try again.\n'
  )
  process.exit(1)
}

const { sql } = await import('./connection.js')
const { seedCatalog } = await import('./seed-catalog.js')

// Show what is being preserved, so it is obvious this did not eat anything.
const [{ users, orders, builds, wishlist }] = await sql`
  SELECT (SELECT COUNT(*)::INT FROM users)        AS users,
         (SELECT COUNT(*)::INT FROM orders)       AS orders,
         (SELECT COUNT(*)::INT FROM saved_builds) AS builds,
         (SELECT COUNT(*)::INT FROM wishlist)     AS wishlist
`

console.log('Replacing the catalog. Accounts and history are NOT touched.')
console.log(
  `  preserving: ${users} user(s), ${orders} order(s), ${builds} saved build(s), ${wishlist} wishlist row(s)\n`
)

console.log('Clearing the old catalog...')
await sql`DELETE FROM upgrade_rules`
await sql`DELETE FROM learning_cards`
await sql`DELETE FROM products`

// Restart ids at 1 so a reseeded catalog looks like a fresh one.
await sql`ALTER SEQUENCE products_id_seq RESTART WITH 1`
await sql`ALTER SEQUENCE learning_cards_id_seq RESTART WITH 1`
await sql`ALTER SEQUENCE upgrade_rules_id_seq RESTART WITH 1`

const counts = await seedCatalog(sql)

const [after] = await sql`SELECT COUNT(*)::INT AS users FROM users`

console.log(
  `\nDone. Seeded ${counts.products} products, ${counts.learningCards} learning cards, ` +
    `${counts.upgradeRules} upgrade rules.\n` +
    `${after.users} user account(s) still present - sign in as normal.\n`
)

if (wishlist > 0) {
  console.log(
    'Note: wishlist rows pointed at the old product ids and were removed with them.\n' +
      'Orders were not - their line items keep the name and price paid.\n'
  )
}
