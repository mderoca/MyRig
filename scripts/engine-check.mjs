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
 *   - every build is physically assemblable: CPU socket matches the motherboard,
 *     RAM generation matches the motherboard, and the PSU covers the draw
 *
 * It runs against db/catalog.js directly, so it needs no database and no network.
 * Exits non-zero on failure.
 */

import { recommendSetup, checkCompatibility, requiredWattage } from '../api/_lib/engine.js'
import { PARTS, ACCESSORIES, LEARNING_CARDS, UPGRADE_RULES } from '../db/catalog.js'

const catalog = {
  parts: PARTS,
  accessories: ACCESSORIES,
  learningCards: LEARNING_CARDS,
  upgradeRules: UPGRADE_RULES,
}

// What IGDB ACTUALLY returns for these three, copied from live responses on
// 2026-07-19 (ids are IGDB's real ids). These were RAWG-shaped stand-ins until
// the provider changed; fixtures that do not match the real vocabulary test
// nothing useful, because the whole risk lives in the wording of the tags.
const VALORANT = {
  id: 126459,
  name: 'Valorant',
  genres: ['Shooter', 'Tactical'],
  tags: ['Action', 'Fantasy', 'Science fiction', 'class-based', 'cartoon graphics', 'free-to-play', 'kill feed', 'voice chat'],
}
const CYBERPUNK = {
  id: 1877,
  name: 'Cyberpunk 2077',
  genres: ['Shooter', 'Role-playing (RPG)', 'Adventure'],
  tags: ['Action', 'Science fiction', 'Sandbox', 'Open world', 'cyberpunk', 'cybernetics', 'dystopian', 'futuristic'],
}
const MINECRAFT = {
  id: 135400,
  name: 'Minecraft',
  genres: ['Simulator', 'Adventure', 'Arcade'],
  tags: ['Action', 'Fantasy', 'Survival', 'Sandbox', 'zombies', 'monsters', 'wizards', 'dragons'],
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

  // Compatibility is a HARD constraint: an unassemblable build is a broken build.
  const compat = result.compatibility
  console.log(
    `compatibility: ${compat.ok ? 'OK' : 'BROKEN'}  ` +
      `draw ${compat.draw}W, needs ${compat.required}W  ` +
      `(${compat.checks.map((c) => `${c.key}:${c.ok ? 'ok' : 'FAIL'}`).join(' ')})`
  )
  if (!compat.ok) {
    for (const check of compat.checks.filter((c) => !c.ok)) fail(`incompatible - ${check.detail}`)
  }

  // Assert the parts directly too, not only the engine's own verdict - otherwise
  // a checkCompatibility() that always returned ok would pass this script.
  const partOf = (category) => result.items.find((i) => i.category === category)
  const cpu = partOf('cpu')
  const board = partOf('motherboard')
  const ram = partOf('ram')
  const psu = partOf('psu')

  if (!cpu || !board) fail('build is missing a CPU or a motherboard')
  else if (cpu.socket !== board.socket) {
    fail(`socket mismatch: ${cpu.name} is ${cpu.socket}, ${board.name} is ${board.socket}`)
  }
  if (ram && board && ram.ramType !== board.ramType) {
    fail(`memory mismatch: ${ram.name} is ${ram.ramType}, ${board.name} takes ${board.ramType}`)
  }
  if (!psu) fail('build has no power supply')
  else {
    const needed = requiredWattage(result.items.filter((i) => i.category !== 'psu'))
    if (Number(psu.wattage) < needed) {
      fail(`power supply too small: ${psu.name} supplies ${psu.wattage}W, build needs ${needed}W`)
    }
  }

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

// ---------------------------------------------------------------------------
// Compatibility: the checker must REJECT builds that are genuinely broken.
//
// Without these, every assertion above would still pass if checkCompatibility()
// simply returned {ok: true}. A validator that never says no is not a validator.
// ---------------------------------------------------------------------------
console.log('\n=== compatibility rejection checks ===')

const BAD_BUILDS = [
  {
    label: 'AM4 CPU on an AM5 board',
    key: 'socket',
    items: [
      { category: 'cpu', name: 'Ryzen 5 5600', socket: 'AM4', tdp: 65 },
      { category: 'motherboard', name: 'B650 Motherboard (AM5)', socket: 'AM5', ram_type: 'DDR5' },
    ],
  },
  {
    label: 'DDR4 memory in a DDR5 board',
    key: 'memory',
    items: [
      { category: 'motherboard', name: 'B650 Motherboard (AM5)', socket: 'AM5', ram_type: 'DDR5' },
      { category: 'ram', name: '16GB DDR4 RAM', ram_type: 'DDR4' },
    ],
  },
  {
    label: '550W PSU under a 320W GPU and a 125W CPU',
    key: 'power',
    items: [
      { category: 'cpu', name: 'Intel i7 Class CPU', socket: 'LGA1700', tdp: 125 },
      { category: 'gpu', name: 'High-End RTX Class GPU', tdp: 320 },
      { category: 'psu', name: '550W Bronze PSU', wattage: 550 },
    ],
  },
]

for (const bad of BAD_BUILDS) {
  const verdict = checkCompatibility(bad.items)
  const rejected = !verdict.ok && verdict.checks.some((c) => c.key === bad.key && !c.ok)
  console.log(`   ${rejected ? 'PASS' : 'FAIL'}  rejects: ${bad.label}`)
  if (!rejected) fail(`checkCompatibility ACCEPTED a broken build: ${bad.label}`)
}

// And the arithmetic behind the power rule: 125 + 320 + 100 overhead = 545, +25% = 682.
const expected = Math.ceil((125 + 320 + 100) * 1.25)
const actual = requiredWattage([{ tdp: 125 }, { tdp: 320 }])
console.log(`   ${actual === expected ? 'PASS' : 'FAIL'}  requiredWattage = ${actual}W (expected ${expected}W)`)
if (actual !== expected) fail(`requiredWattage returned ${actual}W, expected ${expected}W`)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures ? 1 : 0)
