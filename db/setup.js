/**
 * One-shot database setup against Neon.
 *
 *   npm run db:setup
 *
 * Creates the tables from schema.sql (dropping them first if they exist), then
 * seeds parts, accessories, learning cards and upgrade rules from catalog.js.
 *
 * Saved builds are NOT touched by the seed, but schema.sql drops the table, so
 * running this wipes any saved builds. That is fine for a demo; do not run it
 * against anything you want to keep.
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
const { PARTS, ACCESSORIES, LEARNING_CARDS, UPGRADE_RULES } = await import('./catalog.js')

/** Split schema.sql into statements, ignoring comment-only lines. */
function statementsFrom(sqlText) {
  return sqlText
    .split(/;\s*$/m)
    .map((s) =>
      s
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

console.log('Seeding parts...')
for (const p of PARTS) {
  await sql.query(
    `INSERT INTO parts (name, category, price, tier, best_for, styles, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [p.name, p.category, p.price, p.tier, p.best_for, p.styles, p.reason]
  )
}

console.log('Seeding accessories...')
for (const a of ACCESSORIES) {
  await sql.query(
    `INSERT INTO accessories (name, category, price, best_for, styles, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [a.name, a.category, a.price, a.best_for, a.styles, a.reason]
  )
}

console.log('Seeding learning cards...')
for (const c of LEARNING_CARDS) {
  await sql.query(
    `INSERT INTO learning_cards (title, short_description, beginner_description, category)
     VALUES ($1, $2, $3, $4)`,
    [c.title, c.short_description, c.beginner_description, c.category]
  )
}

console.log('Seeding upgrade rules...')
for (const r of UPGRADE_RULES) {
  await sql.query(
    `INSERT INTO upgrade_rules (condition_type, condition_value, upgrade_name, priority, estimated_cost, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [r.condition_type, r.condition_value, r.upgrade_name, r.priority, r.estimated_cost, r.reason]
  )
}

console.log(
  `\nDone. Seeded ${PARTS.length} parts, ${ACCESSORIES.length} accessories, ` +
    `${LEARNING_CARDS.length} learning cards, ${UPGRADE_RULES.length} upgrade rules.\n`
)
