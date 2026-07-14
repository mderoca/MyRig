/**
 * Regenerates db/seed.sql from db/catalog.js.
 *
 *   npm run db:gen-seed
 *
 * seed.sql is a committed build artifact - it exists so the catalog can be
 * pasted straight into the Neon SQL Editor without running Node. Edit
 * catalog.js and re-run this; do not hand-edit seed.sql.
 *
 * It seeds the catalog only. Users, orders, wishlists and saved builds are
 * created by using the app.
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PRODUCTS, LEARNING_CARDS, UPGRADE_RULES } from './catalog.js'

const here = dirname(fileURLToPath(import.meta.url))

/** Postgres string literal: wrap in quotes, double any embedded quote. */
const str = (value) => `'${String(value).replace(/'/g, "''")}'`

/** Postgres text[] literal, e.g. ARRAY['rgb','streamer']::TEXT[] */
const arr = (values) => `ARRAY[${values.map(str).join(', ')}]::TEXT[]`

/** NULL, or a quoted string. */
const nullable = (value) => (value === null || value === undefined ? 'NULL' : str(value))

const lines = [
  '-- MyRig catalog seed - GENERATED FILE, DO NOT EDIT BY HAND.',
  '-- Source of truth: db/catalog.js   Regenerate with: npm run db:gen-seed',
  '-- Run db/schema.sql first, then this file.',
  '',
  'TRUNCATE products, learning_cards, upgrade_rules RESTART IDENTITY CASCADE;',
  '',
  '-- ---------- products ----------',
  'INSERT INTO products (name, category, kind, price, tier, best_for, styles, reason) VALUES',
  PRODUCTS.map(
    (p) =>
      `  (${str(p.name)}, ${str(p.category)}, ${str(p.kind)}, ${p.price}, ${nullable(p.tier)}, ` +
      `${arr(p.best_for)}, ${arr(p.styles)}, ${str(p.reason)})`
  ).join(',\n') + ';',
  '',
  '-- ---------- learning_cards ----------',
  'INSERT INTO learning_cards (title, short_description, beginner_description, category) VALUES',
  LEARNING_CARDS.map(
    (c) =>
      `  (${str(c.title)}, ${str(c.short_description)}, ${str(c.beginner_description)}, ${str(c.category)})`
  ).join(',\n') + ';',
  '',
  '-- ---------- upgrade_rules ----------',
  'INSERT INTO upgrade_rules (condition_type, condition_value, upgrade_name, priority, estimated_cost, reason) VALUES',
  UPGRADE_RULES.map(
    (r) =>
      `  (${str(r.condition_type)}, ${str(r.condition_value)}, ${str(r.upgrade_name)}, ` +
      `${str(r.priority)}, ${r.estimated_cost}, ${str(r.reason)})`
  ).join(',\n') + ';',
  '',
]

writeFileSync(join(here, 'seed.sql'), lines.join('\n'), 'utf8')

console.log(
  `Wrote db/seed.sql - ${PRODUCTS.length} products, ${LEARNING_CARDS.length} learning cards, ` +
    `${UPGRADE_RULES.length} upgrade rules.`
)
