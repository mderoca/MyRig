/**
 * /api/builds - saved builds, stored in Neon.
 *
 *   GET    /api/builds?userId=myrig_user_ab12cd34   -> that user's builds, newest first
 *   POST   /api/builds                              -> save a build (body below)
 *   DELETE /api/builds?id=7&userId=myrig_user_...   -> delete one of that user's builds
 *
 * There is no login. `userId` is a demo id generated in the browser and kept in
 * localStorage (see src/services/user.js). It identifies a browser, not a person.
 *
 * DELETE still requires the userId and matches on BOTH id and user_id, so one
 * demo user cannot delete another's build just by guessing a row id. This is
 * demo-grade separation, not real authorisation - the app stores no personal
 * data, so there is nothing here worth protecting with a password.
 */

import { sql, hasDatabase } from '../db/connection.js'

/** Demo ids look like myrig_user_ab12cd34. Keep the format tight. */
const USER_ID_PATTERN = /^[a-z0-9_-]{6,64}$/i

function requireDatabase(res) {
  if (hasDatabase) return true
  res.status(503).json({
    error:
      'The database is not configured. Set DATABASE_URL and run `npm run db:setup`. See the README.',
  })
  return false
}

function validUserId(value) {
  return typeof value === 'string' && USER_ID_PATTERN.test(value)
}

// ---------------------------------------------------------------- GET
async function listBuilds(req, res) {
  const userId = String(req.query.userId || '')

  if (!validUserId(userId)) {
    return res.status(400).json({ error: 'A valid userId query parameter is required.' })
  }

  const builds = await sql`
    SELECT id, user_id, build_name, selected_games, budget_tier, gaming_goal,
           setup_style, beginner_mode, recommended_items, total_cost, scores,
           upgrade_path, created_at
    FROM saved_builds
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

  return res.status(200).json({
    builds: builds.map((b) => ({ ...b, total_cost: Number(b.total_cost) })),
  })
}

// ---------------------------------------------------------------- POST
async function saveBuild(req, res) {
  const body = req.body || {}

  if (!validUserId(body.userId)) {
    return res.status(400).json({ error: 'A valid userId is required.' })
  }

  const buildName = String(body.buildName || '').trim().slice(0, 80)
  if (!buildName) {
    return res.status(400).json({ error: 'Give the build a name.' })
  }

  if (!body.budgetTier || !body.gamingGoal || !body.setupStyle) {
    return res
      .status(400)
      .json({ error: 'budgetTier, gamingGoal and setupStyle are required.' })
  }

  // JSONB columns: pass real JSON, and let Postgres validate the shape.
  const [saved] = await sql`
    INSERT INTO saved_builds (
      user_id, build_name, selected_games, budget_tier, gaming_goal, setup_style,
      beginner_mode, recommended_items, total_cost, scores, upgrade_path
    ) VALUES (
      ${body.userId},
      ${buildName},
      ${JSON.stringify(body.selectedGames || [])},
      ${body.budgetTier},
      ${body.gamingGoal},
      ${body.setupStyle},
      ${Boolean(body.beginnerMode)},
      ${JSON.stringify(body.recommendedItems || [])},
      ${Number(body.totalCost) || 0},
      ${JSON.stringify(body.scores || {})},
      ${JSON.stringify(body.upgradePath || [])}
    )
    RETURNING id, build_name, created_at
  `

  return res.status(201).json({ build: saved })
}

// ---------------------------------------------------------------- DELETE
async function deleteBuild(req, res) {
  const id = Number(req.query.id)
  const userId = String(req.query.userId || '')

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A numeric build id is required.' })
  }
  if (!validUserId(userId)) {
    return res.status(400).json({ error: 'A valid userId query parameter is required.' })
  }

  // Matching on user_id as well as id is what stops one demo user deleting another's build.
  const deleted = await sql`
    DELETE FROM saved_builds
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `

  if (!deleted.length) {
    return res.status(404).json({ error: 'No build with that id belongs to this user.' })
  }

  return res.status(200).json({ deleted: deleted[0].id })
}

// ---------------------------------------------------------------- router
export default async function handler(req, res) {
  if (!requireDatabase(res)) return

  try {
    switch (req.method) {
      case 'GET':
        return await listBuilds(req, res)
      case 'POST':
        return await saveBuild(req, res)
      case 'DELETE':
        return await deleteBuild(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed. Use GET, POST or DELETE.' })
    }
  } catch (err) {
    console.error('[api/builds]', err.stack || err.message)
    return res.status(500).json({ error: 'Saved builds are unavailable right now.' })
  }
}
