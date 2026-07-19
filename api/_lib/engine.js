/**
 * The MyRig recommendation engine.
 *
 * Pure, rule-based, and deliberately not AI. Given the quiz answers and the
 * catalog rows from Neon, it returns a complete setup: the items, the budget
 * breakdown, five scores, a style summary and an upgrade path.
 *
 * Everything in here is a pure function of its inputs, so the same quiz always
 * produces the same setup. That makes it easy to demo and easy to explain.
 *
 * Files in /api that start with "_" are helper modules; Vercel does not turn
 * them into their own serverless functions.
 */

// --------------------------------------------------------------------------
// Vocabulary
// --------------------------------------------------------------------------

/** Budget tiers, and the total spend each one targets for the WHOLE setup. */
/**
 * Caps rose by ~$150 per tier when compatibility checking landed. A build now
 * has to include a motherboard and a power supply, which it always really
 * needed — the old caps bought a setup with no way to assemble it. At $900 the
 * extra parts pushed every desk accessory out of the budget, which broke the
 * one thing MyRig claims over PCPartPicker: that it plans a SETUP, not a tower.
 */
export const BUDGET_TIERS = {
  budget: { label: 'Budget', range: 'Under $1,050', cap: 1050 },
  balanced: { label: 'Balanced', range: '$1,050 - $1,700', cap: 1700 },
  high: { label: 'High-end', range: '$1,700+', cap: 2450 },
}

export const GAMING_GOALS = {
  competitive_fps: 'Competitive FPS',
  high_graphics: 'High graphics',
  casual: 'Casual gaming',
  streaming: 'Streaming / content creation',
  balanced: 'Balanced everything',
}

export const SETUP_STYLES = {
  rgb: 'RGB gamer',
  minimalist: 'Minimalist black',
  white: 'White clean setup',
  cozy: 'Cozy setup',
  streamer: 'Streamer setup',
  esports: 'Esports setup',
}

/** Tier ranking. Used to bump a category up or down relative to the budget. */
const TIER_ORDER = ['budget', 'mid', 'high', 'ultra']

/** Which budget tier maps to which baseline component tier. */
const BASE_TIER = { budget: 'budget', balanced: 'mid', high: 'high' }

/** Share of the total budget each category is allowed to spend. Sums to ~0.91;
 *  the remainder funds the style/goal extras (mic, lighting, decor...).
 *
 *  ORDER MATTERS. The selection loop walks these keys in order, and the
 *  compatibility rules are dependent: the motherboard is filtered by the CPU's
 *  socket, and the RAM by the motherboard's memory type. Move `cpu` below
 *  `motherboard` and the socket filter has nothing to filter against. */
const ALLOCATION = {
  cpu: 0.13,
  motherboard: 0.07,
  ram: 0.05,
  gpu: 0.26,
  psu: 0.05,
  storage: 0.06,
  case: 0.05,
  monitor: 0.13,
  keyboard: 0.04,
  mouse: 0.03,
  headset: 0.04,
}

/**
 * How much extra budget each goal pushes into the categories it actually cares
 * about. A competitive player's money belongs in the monitor; a streamer's in
 * the CPU. Weights are renormalised afterwards, so the shares still sum to the
 * same total - this moves money between categories, it does not invent any.
 *
 * Without this, a fixed allocation starves the very category the goal depends
 * on: a streamer could not afford the CPU that makes streaming work.
 */
const GOAL_WEIGHTS = {
  competitive_fps: { monitor: 1.35, mouse: 1.2 },
  high_graphics: { gpu: 1.2, monitor: 1.35 },
  streaming: { cpu: 1.35, ram: 1.3, storage: 1.2 },
  casual: { gpu: 0.85, monitor: 0.85 },
  balanced: {},
}

/**
 * Where leftover budget goes, per goal, most important first.
 *
 * After the first pass the setup is usually under budget. Rather than hand the
 * user a cheap build and call it "under budget", we spend what is left moving
 * these categories up a tier - in the order that matters for what they play.
 * Parts only: accessories have no tier to climb.
 */
const UPGRADE_PRIORITY = {
  competitive_fps: ['monitor', 'gpu', 'cpu', 'storage', 'ram'],
  high_graphics: ['gpu', 'monitor', 'cpu', 'ram', 'storage'],
  streaming: ['cpu', 'ram', 'storage', 'gpu', 'monitor'],
  casual: ['monitor', 'gpu', 'storage', 'ram', 'cpu'],
  balanced: ['gpu', 'monitor', 'cpu', 'storage', 'ram'],
}

/** Categories that come from the `parts` table (the rest come from `accessories`). */
const PART_CATEGORIES = ['cpu', 'motherboard', 'gpu', 'ram', 'psu', 'storage', 'case', 'monitor']

/** How far over its allowance a category may go before it is treated as unaffordable. */
const ALLOWANCE_SLACK = 1.5

/** Which section of the budget breakdown each category rolls up into. */
const GROUP_OF = {
  cpu: 'tower',
  motherboard: 'tower',
  psu: 'tower',
  gpu: 'tower',
  ram: 'tower',
  storage: 'tower',
  case: 'tower',
  monitor: 'monitor',
  keyboard: 'peripherals',
  mouse: 'peripherals',
  headset: 'peripherals',
  microphone: 'desk',
  webcam: 'desk',
  lighting: 'desk',
  desk: 'desk',
}

/** The categories a setup must contain to count as "complete". */
const CORE_CATEGORIES = [
  'cpu',
  'motherboard',
  'psu',
  'gpu',
  'ram',
  'storage',
  'case',
  'monitor',
  'keyboard',
  'mouse',
  'headset',
]

/** IGDB genre/tag words that hint at what kind of player this is. */
const GAME_SIGNALS = {
  competitive: [
    'shooter',
    'esports',
    'competitive',
    'multiplayer',
    'pvp',
    'battle royale',
    'moba',
    'fighting',
    'first-person shooter',
    'fps',
    'tactical',
    'team-based',
  ],
  graphics: [
    'rpg',
    'open world',
    'singleplayer',
    'single player',
    'atmospheric',
    'story rich',
    'adventure',
    'action-adventure',
    'realistic',
    'ray tracing',
    'great soundtrack',
    'cinematic',
    'horror',
    'simulation',
  ],
  casual: [
    'indie',
    'casual',
    'family',
    'sandbox',
    'building',
    'puzzle',
    'platformer',
    'arcade',
    'relaxing',
    'cozy',
    'pixel graphics',
    'co-op',
  ],
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)))
const tierIndex = (tier) => Math.max(0, TIER_ORDER.indexOf(tier))
const bump = (tier, by) => TIER_ORDER[clamp(tierIndex(tier) + by, 0, TIER_ORDER.length - 1)]
const money = (n) => Math.round(Number(n) || 0)
const has = (list, value) => Array.isArray(list) && list.includes(value)

// --------------------------------------------------------------------------
// Compatibility
// --------------------------------------------------------------------------
//
// The rules themselves live in shared/compatibility.js so the Builder page can
// apply exactly the same ones. Re-exported here because engine.js is what
// everything server-side already imports.

export { buildDraw, requiredWattage, isCompatible, checkCompatibility } from '../../shared/compatibility.js'
import { requiredWattage, isCompatible, checkCompatibility } from '../../shared/compatibility.js'


/**
 * Re-fit the power supply to the FINISHED build.
 *
 * Called after the upgrade pass, because that pass can swap in a much hungrier
 * GPU. Picks the cheapest unit that covers the load. If nothing in the catalog
 * is affordable it still returns the cheapest SUFFICIENT one rather than the
 * cheapest one — going slightly over budget is recoverable, shipping a build
 * that trips its own PSU is not.
 *
 * Returns the price difference (may be negative if the build got cheaper).
 */
function fitPowerSupply(picked, pool) {
  const index = picked.findIndex((item) => item.category === 'psu')
  const others = picked.filter((item) => item.category !== 'psu')
  const needed = requiredWattage(others)

  const sufficient = pool
    .filter((item) => item.category === 'psu' && Number(item.wattage) >= needed)
    .sort((a, b) => money(a.price) - money(b.price))

  if (!sufficient.length) return 0

  const chosen = sufficient[0]
  const current = index === -1 ? null : picked[index]

  if (current && current.name === chosen.name) return 0

  if (index === -1) {
    picked.push(chosen)
    return money(chosen.price)
  }

  picked[index] = chosen
  return money(chosen.price) - money(current.price)
}

/**
 * Reads the selected IGDB games and works out what kind of player this is.
 * Returns a 0-1 strength for each of competitive / graphics / casual, plus the
 * dominant one. Used to justify and fine-tune the build.
 */
export function readGameSignal(games = []) {
  const counts = { competitive: 0, graphics: 0, casual: 0 }

  for (const game of games) {
    const words = [...(game.genres || []), ...(game.tags || [])]
      .map((w) => String(w).toLowerCase())

    // Count EVERY matching word, not just whether one matched.
    //
    // Presence-counting (+1 per category) throws away magnitude and ties
    // constantly. Cyberpunk 2077 is the case that proved it: `shooter` scores
    // competitive, `sandbox` scores casual, and `rpg` / `adventure` /
    // `open world` score graphics — a 1-1-1 tie, silently broken by whichever
    // key Object.entries happened to yield first. It came out "competitive",
    // so the app told you to buy frames for a game that wants fidelity.
    // Counting words makes that 3-1-1 for graphics, which is the honest read.
    for (const [signal, keywords] of Object.entries(GAME_SIGNALS)) {
      counts[signal] += words.filter((word) => keywords.some((kw) => word.includes(kw))).length
    }
  }

  const total = counts.competitive + counts.graphics + counts.casual
  const strength = (n) => (total ? n / total : 0)

  const dominant =
    total === 0
      ? null
      : Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

  return {
    counts,
    competitive: strength(counts.competitive),
    graphics: strength(counts.graphics),
    casual: strength(counts.casual),
    dominant,
    gameCount: games.length,
  }
}

/**
 * The tier we aim for in each category.
 *
 * Baseline comes from the budget. Then the gaming goal bumps the categories
 * that goal actually cares about - a competitive player gets a faster monitor,
 * a streamer gets a stronger CPU - and the games themselves nudge it further.
 */
function targetTiers(budgetTier, goal, signal) {
  const base = BASE_TIER[budgetTier] || 'mid'
  const tiers = Object.fromEntries(Object.keys(ALLOCATION).map((c) => [c, base]))

  if (goal === 'competitive_fps') {
    tiers.monitor = bump(base, 1) // high refresh rate is the point of this build
    tiers.gpu = bump(base, 0)
  }

  if (goal === 'high_graphics') {
    tiers.gpu = bump(base, 1) // the GPU is what visual quality actually scales with
    tiers.monitor = bump(base, 1) // ...and a 1440p screen to show it
  }

  if (goal === 'streaming') {
    tiers.cpu = bump(base, 1) // extra cores to encode the stream
    tiers.ram = bump(base, 1)
    tiers.storage = bump(base, 1) // recorded footage eats space
  }

  if (goal === 'casual') {
    tiers.gpu = bump(base, -1) // don't sell them a GPU their games won't use
    tiers.monitor = bump(base, -1)
  }

  // The games themselves get a say, but a smaller one than the stated goal.
  if (signal.dominant === 'competitive' && signal.competitive >= 0.5) {
    tiers.monitor = bump(tiers.monitor, 1)
  }
  if (signal.dominant === 'graphics' && signal.graphics >= 0.5) {
    tiers.gpu = bump(tiers.gpu, 1)
  }

  return tiers
}

/**
 * The budget share for each category, after the goal has had its say.
 * Weights are renormalised so the shares still sum to what ALLOCATION did.
 */
function allocationFor(goal) {
  const weights = GOAL_WEIGHTS[goal] || {}

  const weighted = Object.fromEntries(
    Object.entries(ALLOCATION).map(([category, share]) => [
      category,
      share * (weights[category] || 1),
    ])
  )

  const baseSum = Object.values(ALLOCATION).reduce((a, b) => a + b, 0)
  const newSum = Object.values(weighted).reduce((a, b) => a + b, 0)
  const correction = baseSum / newSum

  return Object.fromEntries(
    Object.entries(weighted).map(([category, share]) => [category, share * correction])
  )
}

/** Does this item suit the goal? 3 = built for it, 1 = fits anything, 0 = no. */
const goalFit = (item, goal) => (has(item.best_for, goal) ? 3 : has(item.best_for, 'any') ? 1 : 0)

/** Does this item suit the style? Same scale. */
const styleFit = (item, style) => (has(item.styles, style) ? 3 : has(item.styles, 'any') ? 1 : 0)

/**
 * Picks one item from a category.
 *
 * Scores every candidate on four things - does it suit the goal, does it suit
 * the style, is it the tier we want, and can we afford it - then takes the best.
 * Affordability is weighted hard so the build stays near budget, but a category
 * always returns something (worst case, the cheapest option).
 */
function pickItem(candidates, { goal, style, targetTier, allowance }) {
  if (!candidates.length) return null

  const scored = candidates.map((item) => {
    // Accessories have no tier column - treat them as always on-tier.
    const tier = item.tier ? 3 - Math.abs(tierIndex(item.tier) - tierIndex(targetTier)) : 3
    const affordable = money(item.price) <= allowance

    const score =
      goalFit(item, goal) +
      styleFit(item, style) +
      Math.max(0, tier) * 2 +
      (affordable ? 3 : -6)

    return { item, score, affordable }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Same score: prefer the better (more expensive) item we can still afford.
    if (a.affordable && b.affordable) return money(b.item.price) - money(a.item.price)
    return money(a.item.price) - money(b.item.price)
  })

  const best = scored[0]

  // Nothing fits the allowance: fall back to the cheapest thing in the category
  // rather than leaving a hole in the setup.
  if (!best.affordable) {
    return [...candidates].sort((a, b) => money(a.price) - money(b.price))[0]
  }

  return best.item
}

/**
 * Spends whatever budget is left moving parts up a tier, in the order the goal
 * cares about. A build that comes in at 70% of budget is not a good build - it
 * is an unfinished one.
 *
 * An upgrade is only allowed if it is a strictly higher tier AND it does not
 * make the goal or style fit any worse. That is what stops a casual build being
 * "upgraded" into a competitive GPU it will never use.
 *
 * Mutates `picked` in place. Returns the money spent.
 */
function upgradePass(picked, pool, { goal, style, leftover }) {
  const order = UPGRADE_PRIORITY[goal] || UPGRADE_PRIORITY.balanced
  let budget = leftover
  let spent = 0
  let changed = true

  // Repeat while anything moved: upgrading the GPU may free the loop to then
  // upgrade the monitor on the next pass.
  while (changed && budget > 0) {
    changed = false

    for (const category of order) {
      const index = picked.findIndex((i) => i.category === category)
      if (index === -1) continue

      const current = picked[index]

      // Everything except the item being replaced — an upgrade has to fit the
      // build it is joining, so a faster CPU on a different socket is not an
      // upgrade, it is a different build.
      const rest = picked.filter((_, i) => i !== index)

      const upgrades = pool
        .filter(
          (candidate) =>
            candidate.category === category &&
            tierIndex(candidate.tier) > tierIndex(current.tier) &&
            goalFit(candidate, goal) >= goalFit(current, goal) &&
            styleFit(candidate, style) >= styleFit(current, style) &&
            money(candidate.price) - money(current.price) <= budget &&
            isCompatible(candidate, rest)
        )
        // Take the biggest jump we can pay for.
        .sort((a, b) => tierIndex(b.tier) - tierIndex(a.tier) || money(b.price) - money(a.price))

      if (!upgrades.length) continue

      const chosen = upgrades[0]
      const cost = money(chosen.price) - money(current.price)

      picked[index] = chosen
      budget -= cost
      spent += cost
      changed = true
    }
  }

  return spent
}

/**
 * Extras the goal genuinely depends on. Money is reserved for these BEFORE the
 * core parts are chosen - a streaming setup without a microphone is not a
 * streaming setup, however good the tower is.
 */
function essentialExtras(goal, style) {
  if (goal === 'streaming' || style === 'streamer') {
    return ['USB Microphone', '1080p Webcam', 'Ring Light']
  }
  return []
}

/**
 * Extras bought with whatever is left. These are what make MyRig a *setup*
 * planner rather than a parts list - but they are the first thing to go when
 * the money runs out.
 */
function optionalExtras(goal, style) {
  const wanted = []

  if (style === 'rgb' || style === 'streamer') wanted.push('LED Light Strip')
  if (style === 'cozy') wanted.push('Warm Desk Lamp', 'Desk Speakers', 'Plant & Decor Set')
  if (style === 'white') wanted.push('Warm Desk Lamp')
  if (style === 'minimalist' || style === 'esports' || style === 'white') {
    wanted.push('Cable Management Kit')
  }

  // Every setup gets a desk mat - it is the cheapest thing that makes a desk
  // feel like a setup, and competitive players genuinely need the space.
  wanted.push('Large Desk Mat')

  return wanted
}

// --------------------------------------------------------------------------
// Scores
// --------------------------------------------------------------------------

function scorePerformance(items, { goal, signal, budgetTier }) {
  const gpu = items.find((i) => i.category === 'gpu')
  const cpu = items.find((i) => i.category === 'cpu')
  const monitor = items.find((i) => i.category === 'monitor')
  const ram = items.find((i) => i.category === 'ram')

  let score = 40
  score += [8, 16, 24, 30][tierIndex(gpu?.tier || 'budget')]
  score += [4, 8, 12, 14][tierIndex(cpu?.tier || 'budget')]

  const hz = Number((monitor?.name || '').match(/(\d+)Hz/i)?.[1] || 60)
  const isHighRes = /1440p|4K/i.test(monitor?.name || '')

  let explanation

  if (goal === 'competitive_fps') {
    score += hz >= 240 ? 18 : hz >= 144 ? 12 : 0
    explanation =
      hz >= 144
        ? `Strong for competitive play - the ${monitor?.name} keeps motion clear, and the ${gpu?.name} can push enough frames to fill it.`
        : `The parts are fine, but the ${monitor?.name} is the weak link for competitive games. A 144Hz+ screen is the upgrade that matters most.`
  } else if (goal === 'high_graphics') {
    score += tierIndex(gpu?.tier) >= 2 ? 18 : 6
    score += isHighRes ? 8 : 0
    explanation = isHighRes
      ? `Built for visual quality - the ${gpu?.name} has the headroom to drive the ${monitor?.name} at high settings.`
      : `The ${gpu?.name} is capable, but a 1440p screen would show much more of the detail it is rendering.`
  } else if (goal === 'streaming') {
    score += tierIndex(cpu?.tier) >= 2 ? 15 : 4
    score += /32GB/.test(ram?.name || '') ? 6 : 0
    explanation = `The ${cpu?.name} carries the encoding load, so the stream stays smooth while the game keeps running.`
  } else if (goal === 'casual') {
    score += 14
    explanation = `Comfortably handles the kind of games you picked without spending on power those games will never use.`
  } else {
    score += 12
    explanation = `A well-rounded build - nothing in it is a bottleneck for the mix of games you selected.`
  }

  // If the picked games disagree with the stated goal, say so honestly.
  if (signal.dominant === 'graphics' && goal === 'casual') {
    score -= 8
    explanation += ` Note: some of your games are graphically demanding, so you may want more GPU than a casual build usually gets.`
  }

  return {
    key: 'performance',
    label: 'Performance Score',
    score: clamp(score),
    explanation,
  }
}

function scoreBudgetBalance(total, cap) {
  const ratio = total / cap
  const score = ratio <= 1 ? 100 - (1 - ratio) * 60 : 100 - (ratio - 1) * 250

  let explanation
  if (ratio > 1.05) {
    explanation = `This setup is $${money(total - cap)} over your budget. Dropping an accessory or a monitor tier brings it back in range.`
  } else if (ratio >= 0.95) {
    explanation = `This setup uses your budget almost exactly, without going over - you are getting the most out of every dollar.`
  } else if (ratio >= 0.8) {
    explanation = `This setup stays close to your selected budget while still including everything the setup needs.`
  } else {
    explanation = `This setup comes in well under budget. You have $${money(cap - total)} spare - consider putting it into the GPU or the monitor.`
  }

  return {
    key: 'budget',
    label: 'Budget Balance Score',
    score: clamp(score, 15, 100),
    explanation,
  }
}

function scoreStyleMatch(items, style) {
  const styled = items.filter((i) => has(i.styles, style))
  const ratio = styled.length / Math.max(1, items.length)
  const score = clamp(45 + ratio * 110, 40, 100)

  const explanation = styled.length
    ? `${styled.length} of your ${items.length} items were chosen specifically for a ${SETUP_STYLES[style]} setup, including the ${styled[0].name}.`
    : `The parts are solid but generic. Swapping the case and peripherals for ${SETUP_STYLES[style]} options would pull the look together.`

  return { key: 'style', label: 'Style Match Score', score, explanation }
}

function scoreUpgradeability(items, upgradePath, { total, cap }) {
  const gpu = items.find((i) => i.category === 'gpu')
  const storage = items.find((i) => i.category === 'storage')

  let score = 45
  if (total < cap * 0.95) score += 15 // money left over is itself upgrade room
  if (upgradePath.length >= 3) score += 15
  if (upgradePath.length >= 5) score += 10
  if (tierIndex(gpu?.tier || 'budget') < 3) score += 10 // GPU is not maxed out
  if (tierIndex(storage?.tier || 'budget') < 2) score += 5

  const highPriority = upgradePath.filter((u) => u.priority === 'High')

  return {
    key: 'upgradeability',
    label: 'Upgradeability Score',
    score: clamp(score),
    explanation: highPriority.length
      ? `There is a clear next step: ${highPriority[0].upgrade_name.toLowerCase()}. In total we found ${upgradePath.length} sensible upgrades for this setup.`
      : `This setup has ${upgradePath.length} suggested upgrades, but nothing urgent - it is already balanced for what you play.`,
  }
}

function scoreCompleteness(items) {
  const present = CORE_CATEGORIES.filter((c) => items.some((i) => i.category === c))
  const hasExtras = items.some((i) => GROUP_OF[i.category] === 'desk')
  const covered = present.length + (hasExtras ? 1 : 0)
  const score = clamp((covered / (CORE_CATEGORIES.length + 1)) * 100)

  const missing = CORE_CATEGORIES.filter((c) => !present.includes(c))

  return {
    key: 'completeness',
    label: 'Setup Completeness Score',
    score,
    explanation: missing.length
      ? `This is not a full setup yet - it is still missing: ${missing.join(', ')}.`
      : `This is a complete setup: PC parts, monitor, keyboard, mouse, headset and desk accessories. You could order it and be playing the same day.`,
  }
}

// --------------------------------------------------------------------------
// Style summary
// --------------------------------------------------------------------------

const STYLE_SUMMARY_COPY = {
  rgb: {
    vibe: 'Bright, colourful and on display.',
    body: 'Your build is chosen to be seen: a glass side panel so the inside shows, RGB lighting on the keyboard and behind the desk, and colours that sync across the whole setup rather than fighting each other.',
  },
  minimalist: {
    vibe: 'Black, quiet and out of the way.',
    body: 'Nothing here lights up. A matte black case, a compact keyboard and a wireless mouse keep the desk clear, and the cable management kit is what actually makes it look finished.',
  },
  white: {
    vibe: 'Light, clean and modern.',
    body: 'A white case and white peripherals anchor the desk, with warm light instead of harsh RGB. A white setup only reads as clean if the cables disappear too, so cable management is part of the build, not an afterthought.',
  },
  cozy: {
    vibe: 'Warm, comfortable, lived-in.',
    body: 'This is a setup you sit at in the evening, not one you grind ranked on. Warm lamp light, speakers so you are not always in a headset, and a plant or two to stop it feeling like an office.',
  },
  streamer: {
    vibe: 'Built to be broadcast.',
    body: 'The camera-facing half of the setup matters as much as the parts. A USB microphone because viewers forgive bad video but not bad audio, a webcam and a ring light, and a CPU with the cores to encode while you play.',
  },
  esports: {
    vibe: 'Fast, plain, zero distractions.',
    body: 'Everything that does not help you aim has been cut. A high refresh monitor, a lightweight mouse, a large mat for low-sensitivity flicks, and no lighting to pull your eyes off the crosshair.',
  },
}

function buildStyleSummary(items, style) {
  const matched = items.filter((i) => has(i.styles, style))
  const copy = STYLE_SUMMARY_COPY[style] || { vibe: '', body: '' }

  return {
    style,
    label: SETUP_STYLES[style] || style,
    vibe: copy.vibe,
    body: copy.body,
    matchedItems: matched.map((i) => ({
      name: i.name,
      category: i.category,
      reason: i.reason,
    })),
  }
}

// --------------------------------------------------------------------------
// Upgrade path
// --------------------------------------------------------------------------

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }

function buildUpgradePath(rules, { budgetTier, goal, style }) {
  const matches = rules.filter(
    (rule) =>
      (rule.condition_type === 'budget_tier' && rule.condition_value === budgetTier) ||
      (rule.condition_type === 'gaming_goal' && rule.condition_value === goal) ||
      (rule.condition_type === 'setup_style' && rule.condition_value === style)
  )

  // The same upgrade can be triggered by more than one rule (e.g. "add a second
  // monitor" fires for both the streaming goal and the balanced budget). Keep
  // the highest-priority copy.
  const byName = new Map()
  for (const rule of matches) {
    const existing = byName.get(rule.upgrade_name)
    if (!existing || PRIORITY_RANK[rule.priority] < PRIORITY_RANK[existing.priority]) {
      byName.set(rule.upgrade_name, rule)
    }
  }

  return [...byName.values()]
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        money(a.estimated_cost) - money(b.estimated_cost)
    )
    .map((rule) => ({
      upgrade_name: rule.upgrade_name,
      priority: rule.priority,
      estimated_cost: money(rule.estimated_cost),
      reason: rule.reason,
    }))
}

// --------------------------------------------------------------------------
// Main entry point
// --------------------------------------------------------------------------

/**
 * @param {object} input
 * @param {object} input.quiz    { budgetTier, gamingGoal, setupStyle, beginnerMode, games[] }
 * @param {Array}  input.parts   rows from the `parts` table
 * @param {Array}  input.accessories rows from the `accessories` table
 * @param {Array}  input.learningCards rows from `learning_cards`
 * @param {Array}  input.upgradeRules  rows from `upgrade_rules`
 */
export function recommendSetup({ quiz, parts, accessories, learningCards = [], upgradeRules = [] }) {
  const budgetTier = BUDGET_TIERS[quiz.budgetTier] ? quiz.budgetTier : 'balanced'
  const goal = GAMING_GOALS[quiz.gamingGoal] ? quiz.gamingGoal : 'balanced'
  const style = SETUP_STYLES[quiz.setupStyle] ? quiz.setupStyle : 'minimalist'
  const beginnerMode = Boolean(quiz.beginnerMode)
  const games = Array.isArray(quiz.games) ? quiz.games : []

  const cap = BUDGET_TIERS[budgetTier].cap
  const signal = readGameSignal(games)
  const tiers = targetTiers(budgetTier, goal, signal)
  const allocation = allocationFor(goal)

  const findAccessory = (want) =>
    accessories.find((a) => a.name === want || a.category === want)

  // ---- 1. Reserve money for the setup, before the tower spends it all ----
  // This is the whole argument of the app in three lines. A streaming setup
  // needs a microphone more than it needs a faster GPU, and a cozy setup with
  // no lamp is not a cozy setup. So the money for those comes off the table
  // BEFORE the core parts get to bid for any of it - otherwise the tower always
  // wins, and you have built a PC rather than planned a setup.
  const price = (item) => money(item.price)
  const sumPrice = (items) => items.reduce((sum, item) => sum + price(item), 0)

  const essentials = essentialExtras(goal, style).map(findAccessory).filter(Boolean)
  const optionals = optionalExtras(goal, style).map(findAccessory).filter(Boolean)

  // Essentials get up to a fifth of the budget; the style flourishes get a
  // smaller slice, because they are nice-to-have rather than load-bearing.
  const essentialReserve = Math.min(sumPrice(essentials), cap * 0.2)
  const styleReserve = Math.min(sumPrice(optionals), cap * 0.12)
  const reserve = essentialReserve + styleReserve

  const coreBudget = cap - reserve
  const picked = []

  // ---- 2. The nine core categories, each with its slice of the core budget ----
  for (const [category, share] of Object.entries(allocation)) {
    const source = PART_CATEGORIES.includes(category)
      ? parts.filter((p) => p.category === category)
      : accessories.filter((a) => a.category === category)

    // HARD constraint: incompatible parts are removed before scoring, so the
    // engine physically cannot choose one. If the filter empties the pool we
    // fall back to the unfiltered list rather than leaving a hole in the build —
    // a visible "not compatible" verdict beats a setup with no motherboard.
    const compatible = source.filter((candidate) => isCompatible(candidate, picked))
    const pool = compatible.length ? compatible : source

    const item = pickItem(pool, {
      goal,
      style,
      targetTier: tiers[category],
      // Slack, because allocations are guidance rather than a hard wall.
      allowance: coreBudget * share * ALLOWANCE_SLACK,
    })

    if (item) picked.push(item)
  }

  // ---- 3. Spend anything left over on the parts this goal cares about ----
  // Only the core budget is on offer here - the upgrade pass may not raid the
  // reserve, or we would be back to a tower with nothing around it.
  const headroom = coreBudget - sumPrice(picked)
  if (headroom > 0) {
    upgradePass(picked, parts, { goal, style, leftover: headroom })
  }

  // ---- 3b. Re-fit the power supply to what the build actually became ----
  // The upgrade pass may have swapped in a far hungrier GPU, and a PSU sized for
  // the pre-upgrade build would be undersized for the one we are shipping.
  fitPowerSupply(picked, parts)

  // ---- 4. Buy the extras: essentials first, then style flourishes ----
  let remaining = cap - sumPrice(picked)

  for (const item of [...essentials, ...optionals]) {
    if (picked.some((p) => p.name === item.name)) continue

    // Extras stop when the money stops. This is what keeps the total honest.
    if (price(item) > remaining) continue

    picked.push(item)
    remaining -= price(item)
  }

  // ---- 5. Budget breakdown ----
  const total = picked.reduce((sum, i) => sum + money(i.price), 0)
  const groups = { tower: 0, monitor: 0, peripherals: 0, desk: 0 }
  for (const item of picked) {
    groups[GROUP_OF[item.category] || 'desk'] += money(item.price)
  }

  const ratio = total / cap
  const status = ratio <= 0.95 ? 'under' : ratio <= 1.05 ? 'close' : 'over'

  // ---- 4. Beginner notes, keyed off the learning cards in the database ----
  const noteFor = (category) =>
    learningCards.find((c) => c.category === category)?.beginner_description || null

  const items = picked.map((item) => ({
    // The product id, so a recommended setup can be added straight to the cart.
    // The engine recommends things you can actually buy - same table, same rows.
    id: item.id ?? null,
    name: item.name,
    category: item.category,
    group: GROUP_OF[item.category] || 'desk',
    price: money(item.price),
    tier: item.tier || null,
    reason: item.reason,
    styles: item.styles || [],
    best_for: item.best_for || [],
    styleMatched: has(item.styles, style),
    beginnerNote: beginnerMode ? noteFor(item.category) : null,
    // Compatibility specs, so the UI can show WHY these parts go together.
    // Null on everything they do not apply to, which is most items.
    socket: item.socket ?? null,
    ramType: item.ram_type ?? null,
    tdp: item.tdp ?? null,
    wattage: item.wattage ?? null,
  }))

  // ---- 5. Upgrade path + scores ----
  const upgradePath = buildUpgradePath(upgradeRules, { budgetTier, goal, style })

  const scores = [
    scorePerformance(picked, { goal, signal, budgetTier }),
    scoreBudgetBalance(total, cap),
    scoreStyleMatch(picked, style),
    scoreUpgradeability(picked, upgradePath, { total, cap }),
    scoreCompleteness(picked),
  ]

  return {
    meta: {
      budgetTier,
      budgetLabel: BUDGET_TIERS[budgetTier].label,
      budgetRange: BUDGET_TIERS[budgetTier].range,
      gamingGoal: goal,
      gamingGoalLabel: GAMING_GOALS[goal],
      setupStyle: style,
      setupStyleLabel: SETUP_STYLES[style],
      beginnerMode,
      games,
      gameSignal: signal,
    },
    items,
    budget: {
      groups,
      total,
      cap,
      ratio: Number(ratio.toFixed(3)),
      status, // under | close | over
      difference: money(cap - total), // positive = money left
    },
    scores,
    styleSummary: buildStyleSummary(picked, style),
    upgradePath,
    // Re-derived from the finished build rather than taken on trust from the
    // filtering above, so a bug in selection shows up here as a failed check.
    compatibility: checkCompatibility(picked),
  }
}
