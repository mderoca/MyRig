/**
 * Engine check - `npm run check`
 *
 * There is no test framework in this project (deliberate: it is a small course
 * project). This script is the safety net for the one part with real logic, the
 * recommendation engine.
 *
 * It runs five representative quizzes through recommendSetup() and asserts the
 * things that would embarrass us in a demo:
 *   - every core category is present, and no duplicates
 *   - the total never blows the budget
 *   - every setup contains desk accessories - it is a SETUP planner, not a PC builder
 *   - the chosen style actually shows up in the build
 *   - scores are in range and always carry an explanation
 *   - beginner notes appear if and only if beginner mode is on
 *   - different goals produce genuinely different builds
 *
 * It runs against db/catalog.js directly, so it needs no database and no network.
 * Exits non-zero on failure.
 */

import { recommendSetup } from '../api/_lib/engine.js'
import { PARTS, ACCESSORIES, LEARNING_CARDS, UPGRADE_RULES } from '../db/catalog.js'

const catalog = {
  parts: PARTS,
  accessories: ACCESSORIES,
  learningCards: LEARNING_CARDS,
  upgradeRules: UPGRADE_RULES,
}

// Stand-ins for what RAWG actually returns for these games.
const VALORANT = {
  id: 1,
  name: 'Valorant',
  genres: ['Shooter'],
  tags: ['Multiplayer', 'Competitive', 'FPS', 'Team-Based'],
}
const CYBERPUNK = {
  id: 2,
  name: 'Cyberpunk 2077',
  genres: ['RPG', 'Action'],
  tags: ['Singleplayer', 'Open World', 'Atmospheric', 'Story Rich'],
}
const MINECRAFT = {
  id: 3,
  name: 'Minecraft',
  genres: ['Simulation', 'Arcade'],
  tags: ['Sandbox', 'Building', 'Co-op', 'Casual'],
}

const CASES = [
  {
    label: 'Budget / competitive / esports / Valorant',
    quiz: { budgetTier: 'budget', gamingGoal: 'competitive_fps', setupStyle: 'esports', beginnerMode: true, games: [VALORANT] },
  },
  {
    label: 'High-end / high graphics / RGB / Cyberpunk',
    quiz: { budgetTier: 'high', gamingGoal: 'high_graphics', setupStyle: 'rgb', beginnerMode: false, games: [CYBERPUNK] },
  },
  {
    label: 'Balanced / streaming / streamer / mixed',
    quiz: { budgetTier: 'balanced', gamingGoal: 'streaming', setupStyle: 'streamer', beginnerMode: false, games: [VALORANT, CYBERPUNK] },
  },
  {
    label: 'Budget / casual / cozy / Minecraft',
    quiz: { budgetTier: 'budget', gamingGoal: 'casual', setupStyle: 'cozy', beginnerMode: true, games: [MINECRAFT] },
  },
  {
    label: 'Balanced / balanced / minimalist / no games',
    quiz: { budgetTier: 'balanced', gamingGoal: 'balanced', setupStyle: 'minimalist', beginnerMode: false, games: [] },
  },
]

const CORE = ['cpu', 'gpu', 'ram', 'storage', 'case', 'monitor', 'keyboard', 'mouse', 'headset']

let failures = 0
const fail = (msg) => {
  failures++
  console.log(`   FAIL: ${msg}`)
}

for (const { label, quiz } of CASES) {
  const result = recommendSetup({ quiz, ...catalog })
  const categories = result.items.map((i) => i.category)

  console.log(`\n=== ${label} ===`)
  console.log(`total $${result.budget.total} / cap $${result.budget.cap} -> ${result.budget.status}`)
  for (const item of result.items) {
    console.log(
      `   ${item.category.padEnd(11)} ${item.name.padEnd(34)} $${String(item.price).padStart(4)}` +
        (item.styleMatched ? '  [style]' : '')
    )
  }
  console.log('scores: ' + result.scores.map((s) => `${s.label.replace(' Score', '')}=${s.score}`).join('  '))
  console.log(`upgrades: ${result.upgradePath.length}`)

  for (const category of CORE) {
    if (!categories.includes(category)) fail(`missing core category: ${category}`)
  }

  const duplicates = categories.filter(
    (c, i) => ['cpu', 'gpu', 'monitor', 'case'].includes(c) && categories.indexOf(c) !== i
  )
  if (duplicates.length) fail(`duplicate single-slot categories: ${duplicates.join(', ')}`)

  if (result.budget.total > result.budget.cap * 1.05) {
    fail(`over budget by more than 5%: $${result.budget.total} vs $${result.budget.cap}`)
  }
  if (result.budget.total < result.budget.cap * 0.5) {
    fail(`suspiciously under budget: $${result.budget.total} vs $${result.budget.cap}`)
  }

  // It is a SETUP planner: a build with nothing beyond the tower is a failure.
  if (!result.items.some((i) => i.group === 'desk')) {
    fail('no desk/accessory items - this is a PC, not a setup')
  }
  const completeness = result.scores.find((s) => s.key === 'completeness').score
  if (completeness < 100) fail(`setup is incomplete (completeness ${completeness})`)

  // The chosen style has to actually show up in what was picked.
  if (!result.items.some((i) => i.styleMatched)) {
    fail(`no item matches the chosen style "${quiz.setupStyle}"`)
  }
  const styleScore = result.scores.find((s) => s.key === 'style').score
  if (styleScore < 60) fail(`style match too weak: ${styleScore}`)

  if (!result.upgradePath.length) fail('no upgrade path generated')

  for (const score of result.scores) {
    if (score.score < 0 || score.score > 100) fail(`${score.label} out of range: ${score.score}`)
    if (!score.explanation) fail(`${score.label} has no explanation`)
  }

  const notes = result.items.filter((i) => i.beginnerNote).length
  if (quiz.beginnerMode && notes === 0) fail('beginner mode on but no beginner notes attached')
  if (!quiz.beginnerMode && notes > 0) fail('beginner mode off but notes were attached')
}

// --- The point of the whole app: the goal must change the build. ---
console.log('\n=== differentiation checks ===')

const run = (gamingGoal, setupStyle, games) =>
  recommendSetup({ quiz: { budgetTier: 'balanced', gamingGoal, setupStyle, games }, ...catalog })

const competitive = run('competitive_fps', 'esports', [VALORANT])
const graphics = run('high_graphics', 'rgb', [CYBERPUNK])
const streaming = run('streaming', 'streamer', [VALORANT])

const nameOf = (result, category) =>
  result.items.find((i) => i.category === category)?.name || '(none)'

console.log(`competitive monitor: ${nameOf(competitive, 'monitor')}`)
console.log(`graphics    monitor: ${nameOf(graphics, 'monitor')}   gpu: ${nameOf(graphics, 'gpu')}`)
console.log(`streaming   cpu:     ${nameOf(streaming, 'cpu')}`)

if (!/144Hz|240Hz/.test(nameOf(competitive, 'monitor'))) {
  fail('competitive build did not get a high-refresh monitor')
}
if (!/1440p/.test(nameOf(graphics, 'monitor'))) {
  fail('high-graphics build did not get a 1440p monitor')
}
if (!streaming.items.some((i) => i.category === 'microphone')) fail('streaming build has no microphone')
if (!streaming.items.some((i) => i.category === 'webcam')) fail('streaming build has no webcam')
if (nameOf(competitive, 'monitor') === nameOf(graphics, 'monitor')) {
  fail('competitive and high-graphics builds got the SAME monitor - no differentiation')
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures ? 1 : 0)
