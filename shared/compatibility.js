/**
 * Compatibility rules - the single source of truth.
 *
 * Imported by BOTH the server-side recommendation engine (api/_lib/engine.js)
 * and the client-side Builder page (src/pages/BuilderPage.vue). It lives outside
 * both so that neither owns it: if the quiz and the manual builder disagreed
 * about what fits what, one of them would be lying to the user.
 *
 * Pure functions, no imports, no secrets, no database - safe to ship to the
 * browser. Fields are snake_case throughout, because that is how rows come back
 * from Postgres and from /api/products.
 */

// --------------------------------------------------------------------------
// Compatibility
// --------------------------------------------------------------------------
//
// These are HARD constraints, not warnings. An incompatible candidate is filtered
// out before scoring ever sees it, so `recommendSetup` cannot emit a build that
// will not assemble. `checkCompatibility` then re-derives the verdict from the
// finished item list, which is what the UI shows and what engine-check asserts —
// deliberately a separate pass, so it can catch a mistake in the filtering rather
// than trusting it.
//
// Three rules, matching the three fields in db/catalog.js:
//   1. CPU socket must equal motherboard socket.
//   2. RAM generation must equal the motherboard's.
//   3. PSU wattage must cover the build's draw plus headroom.
//
// A NULL field means "no constraint" — that is why a keyboard never blocks a
// build. Anything MyRig does not model (case clearance, cooler height, GPU
// length) is not checked and is not claimed to be.

/** Watts drawn by everything that is not the CPU or GPU: board, drives, fans, RAM. */
const SYSTEM_OVERHEAD_WATTS = 100

/** A PSU should not run at 100% of its rating. 1.25 = 25% headroom. */
const PSU_HEADROOM = 1.25

/** What the build actually draws, before headroom. */
export function buildDraw(items = []) {
  return items.reduce((sum, item) => sum + (Number(item?.tdp) || 0), 0) + SYSTEM_OVERHEAD_WATTS
}

/** The smallest PSU rating this build may use, headroom included. */
export function requiredWattage(items = []) {
  return Math.ceil(buildDraw(items) * PSU_HEADROOM)
}

/**
 * Can `candidate` join a build that already contains `others`?
 *
 * `others` must NOT include the item being replaced — pass the rest of the build.
 * Deliberately symmetric: the motherboard checks the CPU and the CPU checks the
 * motherboard, so the answer does not depend on pick order.
 *
 * NOTE: GPU and CPU are NOT checked against the PSU here. The PSU is re-fitted to
 * the finished build by `fitPowerSupply()` after the upgrade pass, so blocking a
 * GPU upgrade on the provisional PSU would freeze the build at whatever it could
 * power at the start.
 */
export function isCompatible(candidate, others = []) {
  if (!candidate) return false

  const find = (category) => others.find((item) => item.category === category)
  const conflicts = (a, b) => a && b && a !== b

  switch (candidate.category) {
    case 'cpu':
      return !conflicts(candidate.socket, find('motherboard')?.socket)

    case 'motherboard':
      return (
        !conflicts(candidate.socket, find('cpu')?.socket) &&
        !conflicts(candidate.ram_type, find('ram')?.ram_type)
      )

    case 'ram':
      return !conflicts(candidate.ram_type, find('motherboard')?.ram_type)

    case 'psu':
      return Number(candidate.wattage) >= requiredWattage(others)

    default:
      return true
  }
}

/**
 * Re-derive the compatibility verdict from a finished build.
 *
 * This is what the UI renders and what the checks assert. It reports every rule
 * it applied, including the ones that passed, so "compatible" is a statement
 * about specific checks rather than a bare claim.
 */
export function checkCompatibility(items = []) {
  const find = (category) => items.find((item) => item.category === category)
  const cpu = find('cpu')
  const motherboard = find('motherboard')
  const ram = find('ram')
  const psu = find('psu')

  const checks = []

  if (cpu && motherboard) {
    const ok = cpu.socket === motherboard.socket
    checks.push({
      key: 'socket',
      label: 'CPU fits the motherboard',
      ok,
      detail: ok
        ? `${cpu.name} and ${motherboard.name} are both ${cpu.socket}.`
        : `${cpu.name} is ${cpu.socket} but ${motherboard.name} is ${motherboard.socket}.`,
    })
  }

  if (ram && motherboard) {
    const ok = ram.ram_type === motherboard.ram_type
    checks.push({
      key: 'memory',
      label: 'Memory matches the motherboard',
      ok,
      detail: ok
        ? `${motherboard.name} takes ${motherboard.ram_type}, and the kit is ${ram.ram_type}.`
        : `${motherboard.name} takes ${motherboard.ram_type} but the kit is ${ram.ram_type}.`,
    })
  }

  if (psu) {
    const needed = requiredWattage(items.filter((item) => item.category !== 'psu'))
    const ok = Number(psu.wattage) >= needed
    checks.push({
      key: 'power',
      label: 'Power supply is big enough',
      ok,
      detail: ok
        ? `The build draws about ${buildDraw(items)}W; ${psu.name} covers the ${needed}W needed with headroom.`
        : `The build needs ${needed}W but ${psu.name} only supplies ${psu.wattage}W.`,
    })
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
    draw: buildDraw(items),
    required: requiredWattage(items.filter((item) => item.category !== 'psu')),
    // Say plainly what is NOT covered, so nobody reads this as a full validation.
    notChecked: ['case clearance', 'GPU length', 'cooler height', 'BIOS revision'],
  }
}
