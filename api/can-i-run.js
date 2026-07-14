/**
 * POST /api/can-i-run   { gameId }
 *
 * "Can I Run It?" - pick a game, get the build that runs it and what it costs.
 *
 * Public: no sign-in needed. This is the page that shows off the whole idea -
 * a real game from RAWG drives a real build from our own catalog.
 *
 * How it decides: it reads the game's genres and tags from RAWG and lets the
 * SAME recommendation engine the quiz uses infer what the game needs. A shooter
 * tagged "competitive" gets frames; an open-world RPG gets fidelity.
 *
 * Response: { game, verdict, builds: { minimum, recommended } }
 */

import { getGame, RawgError } from './_lib/rawg.js'
import { loadCatalog, DatabaseNotConfigured } from './_lib/catalog.js'
import { recommendSetup, readGameSignal } from './_lib/engine.js'
import { assertSameOrigin, AuthError } from './_lib/auth.js'

/**
 * Turn what we know about the game into a gaming goal the engine understands.
 * The game's own tags decide - that is the point of the feature.
 */
function goalForGame(game) {
  const signal = readGameSignal([game])

  if (signal.dominant === 'competitive') return 'competitive_fps'
  if (signal.dominant === 'graphics') return 'high_graphics'
  if (signal.dominant === 'casual') return 'casual'
  return 'balanced'
}

/** Just the tower and the screen - "can I run it" is not a question about desk mats. */
const RIG_ONLY = (item) => ['cpu', 'gpu', 'ram', 'storage', 'case', 'monitor'].includes(item.category)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    assertSameOrigin(req)

    const gameId = Number(req.body?.gameId)
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ error: 'A valid gameId is required.' })
    }

    const [game, catalog] = await Promise.all([getGame(gameId), loadCatalog()])

    const gamingGoal = goalForGame(game)

    // Two builds, so the page can say "this is the floor, this is what you want".
    const build = (budgetTier) => {
      const setup = recommendSetup({
        quiz: { budgetTier, gamingGoal, setupStyle: 'minimalist', beginnerMode: false, games: [game] },
        ...catalog,
      })

      const items = setup.items.filter(RIG_ONLY)

      return {
        budgetTier,
        items,
        total: items.reduce((sum, item) => sum + item.price, 0),
        performance: setup.scores.find((s) => s.key === 'performance'),
      }
    }

    const minimum = build('budget')
    const recommended = build(gamingGoal === 'high_graphics' ? 'high' : 'balanced')

    return res.status(200).json({
      game: {
        id: game.id,
        name: game.name,
        image: game.image,
        rating: game.rating,
        released: game.released,
        genres: game.genres,
        tags: game.tags,
        description: (game.description || '').slice(0, 400),
      },
      verdict: {
        gamingGoal,
        signal: readGameSignal([game]),
        headline:
          gamingGoal === 'competitive_fps'
            ? 'This is a competitive game. Frame rate matters more than fidelity here.'
            : gamingGoal === 'high_graphics'
              ? 'This game is demanding. The graphics card is what decides whether it looks good.'
              : gamingGoal === 'casual'
                ? 'This game is light. You do not need to spend much to run it well.'
                : 'This game is a middleweight. A balanced build handles it comfortably.',
      },
      builds: { minimum, recommended },
    })
  } catch (err) {
    const status =
      err instanceof RawgError || err instanceof DatabaseNotConfigured || err instanceof AuthError
        ? err.status
        : 500
    console.error('[api/can-i-run]', status, err.message)
    return res.status(status).json({ error: err.message || 'Could not work that out.' })
  }
}
