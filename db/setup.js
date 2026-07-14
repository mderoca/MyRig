/**
 * One-shot database setup against Neon.
 *
 *   npm run db:setup
 *
 * Creates the tables from schema.sql (dropping them first if they exist), then
 * seeds the catalog from catalog.js.
 *
 * WARNING: schema.sql DROPs every table, including users, orders and
 * saved_builds. Running this wipes all accounts and all order history. That is
 * fine for a demo. Do not run it against anything you want to keep.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

const here = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error(
    '\nDATABASE_URL is not set.\n' +
      'Copy .env.example to .env and paste your Neon connection string, then try again.\n'
  )
  process.exit(1)
}

// Imported after the env check so connection.js sees DATABASE_URL.
const { sql } = await import('./connection.js')
const { PRODUCTS, LEARNING_CARDS, UPGRADE_RULES } = await import('./catalog.js')

/** Split schema.sql into statements, ignoring comment-only lines. */
function statementsFrom(sqlText) {
  return sqlText
    .split(/;\s*$/m)
    .map((statement) =>
      statement
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter(Boolean)
}

console.log('Applying schema...')
for (const statement of statementsFrom(readFileSync(join(here, 'schema.sql'), 'utf8'))) {
  await sql.query(statement)
}

console.log('Seeding products...')
for (const product of PRODUCTS) {
  await sql.query(
    `INSERT INTO products (name, category, kind, price, tier, best_for, styles, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      product.name,
      product.category,
      product.kind,
      product.price,
      product.tier,
      product.best_for,
      product.styles,
      product.reason,
    ]
  )
}

console.log('Seeding learning cards...')
for (const card of LEARNING_CARDS) {
  await sql.query(
    `INSERT INTO learning_cards (title, short_description, beginner_description, category)
     VALUES ($1, $2, $3, $4)`,
    [card.title, card.short_description, card.beginner_description, card.category]
  )
}

console.log('Seeding upgrade rules...')
for (const rule of UPGRADE_RULES) {
  await sql.query(
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

console.log(
  `\nDone. Seeded ${PRODUCTS.length} products, ${LEARNING_CARDS.length} learning cards, ` +
    `${UPGRADE_RULES.length} upgrade rules.\n` +
    `Register an account in the app to create your first user.\n`
)
