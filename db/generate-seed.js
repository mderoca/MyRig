/**
 * Regenerates db/seed.sql from db/catalog.js.
 *
 *   npm run db:gen-seed
 *
 * seed.sql is a committed build artifact - it exists so the schema and data can
 * be pasted straight into the Neon SQL Editor without running Node. Edit
 * catalog.js and re-run this; do not hand-edit seed.sql.
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PARTS, ACCESSORIES, LEARNING_CARDS, UPGRADE_RULES } from './catalog.js'

const here = dirname(fileURLToPath(import.meta.url))

/** Postgres string literal: wrap in quotes, double any embedded quote. */
const str = (value) => `'${String(value).replace(/'/g, "''")}'`

/** Postgres text[] literal, e.g. ARRAY['rgb','streamer']::TEXT[] */
const arr = (values) => `ARRAY[${values.map(str).join(', ')}]::TEXT[]`

const lines = [
  '-- MyRig seed data - GENERATED FILE, DO NOT EDIT BY HAND.',
  '-- Source of truth: db/catalog.js   Regenerate with: npm run db:gen-seed',
  '-- Run db/schema.sql first, then this file.',
  '',
  'TRUNCATE parts, accessories, learning_cards, upgrade_rules RESTART IDENTITY;',
  '',
  '-- ---------- parts ----------',
  'INSERT INTO parts (name, category, price, tier, best_for, styles, reason) VALUES',
  PARTS.map(
    (p) =>
      `  (${str(p.name)}, ${str(p.category)}, ${p.price}, ${str(p.tier)}, ${arr(p.best_for)}, ${arr(p.styles)}, ${str(p.reason)})`
  ).join(',\n') + ';',
  '',
  '-- ---------- accessories ----------',
  'INSERT INTO accessories (name, category, price, best_for, styles, reason) VALUES',
  ACCESSORIES.map(
    (a) =>
      `  (${str(a.name)}, ${str(a.category)}, ${a.price}, ${arr(a.best_for)}, ${arr(a.styles)}, ${str(a.reason)})`
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
      `  (${str(r.condition_type)}, ${str(r.condition_value)}, ${str(r.upgrade_name)}, ${str(r.priority)}, ${r.estimated_cost}, ${str(r.reason)})`
  ).join(',\n') + ';',
  '',
]

writeFileSync(join(here, 'seed.sql'), lines.join('\n'), 'utf8')

console.log(
  `Wrote db/seed.sql - ${PARTS.length} parts, ${ACCESSORIES.length} accessories, ` +
    `${LEARNING_CARDS.length} learning cards, ${UPGRADE_RULES.length} upgrade rules.`
)
