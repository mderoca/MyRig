/**
 * Loads the catalog out of Neon.
 *
 * The store and the recommendation engine read the SAME `products` table - the
 * engine just wants it split back into parts and accessories, which is what
 * loadCatalog() does. Changing what MyRig sells or recommends is a data change
 * (edit db/catalog.js, re-run `npm run db:setup`), not a code change.
 */

import { sql, hasDatabase } from '../../db/connection.js'

export class DatabaseNotConfigured extends Error {
  constructor() {
    super(
      'The database is not configured. Set DATABASE_URL and run `npm run db:setup`. See the README.'
    )
    this.status = 503
  }
}

/** Postgres NUMERIC comes back as a string - make prices numbers again. */
export const withNumericPrice = (row) => ({ ...row, price: Number(row.price) })

export function assertDatabase() {
  if (!hasDatabase) throw new DatabaseNotConfigured()
}

/** Every product, split the way the recommendation engine expects. */
export async function loadCatalog() {
  assertDatabase()

  const [products, learningCards, upgradeRules] = await Promise.all([
    sql`SELECT id, name, category, kind, price, tier, best_for, styles, reason, in_stock
        FROM products
        WHERE in_stock = TRUE
        ORDER BY category, price`,
    sql`SELECT id, title, short_description, beginner_description, category
        FROM learning_cards
        ORDER BY id`,
    sql`SELECT id, condition_type, condition_value, upgrade_name, priority, estimated_cost, reason
        FROM upgrade_rules
        ORDER BY id`,
  ])

  const priced = products.map(withNumericPrice)

  return {
    products: priced,
    parts: priced.filter((p) => p.kind === 'part'),
    accessories: priced.filter((p) => p.kind === 'accessory'),
    learningCards,
    upgradeRules: upgradeRules.map((rule) => ({
      ...rule,
      estimated_cost: Number(rule.estimated_cost),
    })),
  }
}
