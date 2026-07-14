/**
 * /api/builds - setups saved from the quiz.
 *
 *   GET    /api/builds        -> the signed-in user's builds, newest first
 *   POST   /api/builds        -> save the current setup
 *   DELETE /api/builds?id=7   -> delete one of their builds
 *
 * Saving requires an account. Running the quiz does not - you can plan a whole
 * setup signed out; you just cannot keep it.
 *
 * SECURITY: the user id comes from the session cookie, never from the request.
 * DELETE matches on id AND user_id, so passing someone else's build id gets a
 * 404, not their build.
 */

import { sql } from '../db/connection.js'
import { assertDatabase, DatabaseNotConfigured } from './_lib/catalog.js'
import { AuthError, assertSameOrigin, requireUser } from './_lib/auth.js'

const BUDGET_TIERS = ['budget', 'balanced', 'high']
const GAMING_GOALS = ['competitive_fps', 'high_graphics', 'casual', 'streaming', 'balanced']
const SETUP_STYLES = ['rgb', 'minimalist', 'white', 'cozy', 'streamer', 'esports']

// ---------------------------------------------------------------- GET
async function list(user, res) {
  const builds = await sql`
    SELECT id, build_name, selected_games, budget_tier, gaming_goal, setup_style,
           beginner_mode, recommended_items, total_cost, scores, upgrade_path, created_at
    FROM saved_builds
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `

  return res.status(200).json({
    builds: builds.map((build) => ({ ...build, total_cost: Number(build.total_cost) })),
  })
}

// ---------------------------------------------------------------- POST
async function save(user, req, res) {
  const body = req.body || {}

  const buildName = String(body.buildName || '').trim().slice(0, 80)
  if (!buildName) return res.status(400).json({ error: 'Give the build a name.' })

  if (!BUDGET_TIERS.includes(body.budgetTier)) {
    return res.status(400).json({ error: 'Unknown budget tier.' })
  }
  if (!GAMING_GOALS.includes(body.gamingGoal)) {
    return res.status(400).json({ error: 'Unknown gaming goal.' })
  }
  if (!SETUP_STYLES.includes(body.setupStyle)) {
    return res.status(400).json({ error: 'Unknown setup style.' })
  }

  const totalCost = Number(body.totalCost)
  if (!Number.isFinite(totalCost) || totalCost < 0) {
    return res.status(400).json({ error: 'Invalid total cost.' })
  }

  const [saved] = await sql`
    INSERT INTO saved_builds (
      user_id, build_name, selected_games, budget_tier, gaming_goal, setup_style,
      beginner_mode, recommended_items, total_cost, scores, upgrade_path
    ) VALUES (
      ${user.id},
      ${buildName},
      ${JSON.stringify(body.selectedGames || [])},
      ${body.budgetTier},
      ${body.gamingGoal},
      ${body.setupStyle},
      ${Boolean(body.beginnerMode)},
      ${JSON.stringify(body.recommendedItems || [])},
      ${totalCost},
      ${JSON.stringify(body.scores || [])},
      ${JSON.stringify(body.upgradePath || [])}
    )
    RETURNING id, build_name, created_at
  `

  return res.status(201).json({ build: saved })
}

// ---------------------------------------------------------------- DELETE
async function remove(user, req, res) {
  const id = Number(req.query.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A numeric build id is required.' })
  }

  const deleted = await sql`
    DELETE FROM saved_builds
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING id
  `

  if (!deleted.length) {
    return res.status(404).json({ error: 'No build with that id belongs to you.' })
  }

  return res.status(200).json({ deleted: deleted[0].id })
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
        return await save(user, req, res)
      case 'DELETE':
        return await remove(user, req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed. Use GET, POST or DELETE.' })
    }
  } catch (err) {
    const status = err instanceof AuthError || err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/builds]', status, err.message)
    return res
      .status(status)
      .json({ error: status === 500 ? 'Saved builds are unavailable right now.' : err.message })
  }
}
