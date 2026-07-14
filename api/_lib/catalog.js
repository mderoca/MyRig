/**
 * Loads the catalog tables out of Neon.
 *
 * Everything the recommendation engine chooses from lives in the database -
 * parts, accessories, learning cards and upgrade rules. Changing what MyRig
 * recommends is a data change (edit db/catalog.js, re-run `npm run db:setup`),
 * not a code change.
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
const withNumericPrice = (row) => ({ ...row, price: Number(row.price) })

export async function loadCatalog() {
  if (!hasDatabase) throw new DatabaseNotConfigured()

  const [parts, accessories, learningCards, upgradeRules] = await Promise.all([
    sql`SELECT id, name, category, price, tier, best_for, styles, reason FROM parts ORDER BY category, price`,
    sql`SELECT id, name, category, price, best_for, styles, reason FROM accessories ORDER BY category, price`,
    sql`SELECT id, title, short_description, beginner_description, category FROM learning_cards ORDER BY id`,
    sql`SELECT id, condition_type, condition_value, upgrade_name, priority, estimated_cost, reason FROM upgrade_rules ORDER BY id`,
  ])

  return {
    parts: parts.map(withNumericPrice),
    accessories: accessories.map(withNumericPrice),
    learningCards,
    upgradeRules: upgradeRules.map((r) => ({ ...r, estimated_cost: Number(r.estimated_cost) })),
  }
}
