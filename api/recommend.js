/**
 * POST /api/recommend
 *
 * The heart of the app. Takes the quiz answers, loads the catalog from Neon,
 * runs the rule-based engine, and returns a complete setup.
 *
 * Request body:
 *   {
 *     budgetTier:   'budget' | 'balanced' | 'high',
 *     gamingGoal:   'competitive_fps' | 'high_graphics' | 'casual' | 'streaming' | 'balanced',
 *     setupStyle:   'rgb' | 'minimalist' | 'white' | 'cozy' | 'streamer' | 'esports',
 *     beginnerMode: boolean,
 *     games:        [{ id, name, image, rating, genres[], platforms[], tags[] }]   // from RAWG
 *   }
 *
 * Response:
 *   { meta, items[], budget, scores[], styleSummary, upgradePath[] }
 */

import { loadCatalog, DatabaseNotConfigured } from './_lib/catalog.js'
import { recommendSetup, BUDGET_TIERS, GAMING_GOALS, SETUP_STYLES } from './_lib/engine.js'

/** Reject nonsense before it reaches the engine, and say exactly what was wrong. */
function validate(body) {
  const errors = []

  if (!body || typeof body !== 'object') return ['Request body must be JSON.']

  if (!BUDGET_TIERS[body.budgetTier]) {
    errors.push(`budgetTier must be one of: ${Object.keys(BUDGET_TIERS).join(', ')}.`)
  }
  if (!GAMING_GOALS[body.gamingGoal]) {
    errors.push(`gamingGoal must be one of: ${Object.keys(GAMING_GOALS).join(', ')}.`)
  }
  if (!SETUP_STYLES[body.setupStyle]) {
    errors.push(`setupStyle must be one of: ${Object.keys(SETUP_STYLES).join(', ')}.`)
  }
  if (body.games !== undefined && !Array.isArray(body.games)) {
    errors.push('games must be an array.')
  }
  if (Array.isArray(body.games) && body.games.length > 20) {
    errors.push('Select at most 20 games.')
  }

  return errors
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const errors = validate(req.body)
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const { parts, accessories, learningCards, upgradeRules } = await loadCatalog()

    const setup = recommendSetup({
      quiz: {
        budgetTier: req.body.budgetTier,
        gamingGoal: req.body.gamingGoal,
        setupStyle: req.body.setupStyle,
        beginnerMode: Boolean(req.body.beginnerMode),
        games: req.body.games || [],
      },
      parts,
      accessories,
      learningCards,
      upgradeRules,
    })

    return res.status(200).json(setup)
  } catch (err) {
    const status = err instanceof DatabaseNotConfigured ? err.status : 500
    console.error('[api/recommend]', err.stack || err.message)
    return res.status(status).json({ error: err.message || 'Could not generate a setup.' })
  }
}
