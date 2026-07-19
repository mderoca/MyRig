/**
 * Catalog seeding, shared by both database scripts.
 *
 *   db/setup.js         drops and recreates every table, then calls this
 *   db/reseed.js        replaces ONLY the catalog, then calls this
 *
 * Kept in one place so the two cannot drift: adding a column to `products`
 * should never mean remembering to edit two INSERT statements.
 */

import { PRODUCTS, LEARNING_CARDS, UPGRADE_RULES } from './catalog.js'

/**
 * Insert the catalog. Assumes the three tables exist and are empty.
 *
 * `sql` is the tagged-template client from connection.js. Called directly with a
 * query string and a parameter array it runs an ordinary parameterized query,
 * which is what this needs — there is no `sql.query()` on
 * @neondatabase/serverless 0.x.
 */
export async function seedCatalog(sql) {
  console.log('Seeding products...')
  for (const product of PRODUCTS) {
    await sql(
      `INSERT INTO products (name, category, kind, price, tier, best_for, styles, reason,
                             socket, ram_type, tdp, wattage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        product.name,
        product.category,
        product.kind,
        product.price,
        product.tier,
        product.best_for,
        product.styles,
        product.reason,
        product.socket ?? null,
        product.ram_type ?? null,
        product.tdp ?? null,
        product.wattage ?? null,
      ]
    )
  }

  console.log('Seeding learning cards...')
  for (const card of LEARNING_CARDS) {
    await sql(
      `INSERT INTO learning_cards (title, short_description, beginner_description, category)
       VALUES ($1, $2, $3, $4)`,
      [card.title, card.short_description, card.beginner_description, card.category]
    )
  }

  console.log('Seeding upgrade rules...')
  for (const rule of UPGRADE_RULES) {
    await sql(
      `INSERT INTO upgrade_rules (condition_type, condition_value, upgrade_name, priority, estimated_cost, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        rule.condition_type,
        rule.condition_value,
        rule.upgrade_name,
        rule.priority,
        rule.estimated_cost,
        rule.reason,
      ]
    )
  }

  return {
    products: PRODUCTS.length,
    learningCards: LEARNING_CARDS.length,
    upgradeRules: UPGRADE_RULES.length,
  }
}
