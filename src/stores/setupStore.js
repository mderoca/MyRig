/**
 * The one piece of shared state in the app (Pinia).
 *
 * Holds the quiz answers and the generated setup, so the quiz page can hand off
 * to the recommendation page without passing everything through the URL.
 *
 * Both are mirrored into localStorage, so refreshing the recommendation page -
 * or coming back to it later - does not throw away the result.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../services/api.js'

const STORAGE_KEY = 'myrig_state'

/** The quiz options. These strings are the contract with the API - keep in sync
 *  with BUDGET_TIERS / GAMING_GOALS / SETUP_STYLES in api/_lib/engine.js. */
export const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', detail: 'Under $900', blurb: 'Get playing for as little as possible.' },
  { value: 'balanced', label: 'Balanced', detail: '$900 - $1500', blurb: 'The sweet spot for most people.' },
  { value: 'high', label: 'High-end', detail: '$1500+', blurb: 'No compromises on the parts that matter.' },
]

export const GOAL_OPTIONS = [
  { value: 'competitive_fps', label: 'Competitive FPS', blurb: 'Valorant, CS, Apex. Frames over looks.' },
  { value: 'high_graphics', label: 'High graphics', blurb: 'Cyberpunk, Elden Ring. Make it look incredible.' },
  { value: 'casual', label: 'Casual gaming', blurb: 'Minecraft, Sims, indies. Nothing demanding.' },
  { value: 'streaming', label: 'Streaming / content', blurb: 'Play and broadcast at the same time.' },
  { value: 'balanced', label: 'Balanced everything', blurb: 'A bit of all of it.' },
]

export const STYLE_OPTIONS = [
  { value: 'rgb', label: 'RGB gamer', blurb: 'Colour, glow, glass side panel.' },
  { value: 'minimalist', label: 'Minimalist black', blurb: 'Black, quiet, no lighting.' },
  { value: 'white', label: 'White clean setup', blurb: 'Bright, tidy, modern.' },
  { value: 'cozy', label: 'Cozy setup', blurb: 'Warm light, speakers, plants.' },
  { value: 'streamer', label: 'Streamer setup', blurb: 'Camera-ready, mic and lighting.' },
  { value: 'esports', label: 'Esports setup', blurb: 'Fast, plain, zero distractions.' },
]

function loadPersisted() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export const useSetupStore = defineStore('setup', () => {
  const persisted = loadPersisted()

  // ---- Quiz answers ----
  const budgetTier = ref(persisted?.quiz?.budgetTier || '')
  const gamingGoal = ref(persisted?.quiz?.gamingGoal || '')
  const setupStyle = ref(persisted?.quiz?.setupStyle || '')
  const beginnerMode = ref(persisted?.quiz?.beginnerMode || false)
  const selectedGames = ref(persisted?.quiz?.games || [])

  // ---- Generated setup ----
  const setup = ref(persisted?.setup || null)
  const loading = ref(false)
  const error = ref('')

  const quiz = computed(() => ({
    budgetTier: budgetTier.value,
    gamingGoal: gamingGoal.value,
    setupStyle: setupStyle.value,
    beginnerMode: beginnerMode.value,
    games: selectedGames.value,
  }))

  /** The quiz is answerable without games, but the three choices are required. */
  const isComplete = computed(
    () => Boolean(budgetTier.value && gamingGoal.value && setupStyle.value)
  )

  const hasSetup = computed(() => Boolean(setup.value))

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ quiz: quiz.value, setup: setup.value })
      )
    } catch {
      // Storage full or blocked - the app still works, it just will not remember.
    }
  }

  // ---- Game selection ----
  function toggleGame(game) {
    const index = selectedGames.value.findIndex((g) => g.id === game.id)
    if (index >= 0) {
      selectedGames.value.splice(index, 1)
    } else {
      selectedGames.value.push(game)
    }
    persist()
  }

  function removeGame(id) {
    selectedGames.value = selectedGames.value.filter((g) => g.id !== id)
    persist()
  }

  const isGameSelected = (id) => selectedGames.value.some((g) => g.id === id)

  /** Runs the quiz through /api/recommend. Resolves true when a setup was produced. */
  async function generate() {
    if (!isComplete.value) {
      error.value = 'Pick a budget, a gaming goal and a setup style first.'
      return false
    }

    loading.value = true
    error.value = ''

    try {
      setup.value = await api.generateSetup(quiz.value)
      persist()
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Saves the current setup to Neon against the signed-in user.
   * Requires an account - the server takes the user from the session cookie, so
   * there is no user id to pass here. Throws a 401 if signed out.
   */
  async function save(buildName) {
    if (!setup.value) throw new Error('There is no setup to save yet.')

    return api.saveBuild({
      buildName,
      selectedGames: selectedGames.value,
      budgetTier: budgetTier.value,
      gamingGoal: gamingGoal.value,
      setupStyle: setupStyle.value,
      beginnerMode: beginnerMode.value,
      recommendedItems: setup.value.items,
      totalCost: setup.value.budget.total,
      scores: setup.value.scores,
      upgradePath: setup.value.upgradePath,
    })
  }

  function reset() {
    budgetTier.value = ''
    gamingGoal.value = ''
    setupStyle.value = ''
    beginnerMode.value = false
    selectedGames.value = []
    setup.value = null
    error.value = ''
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  }

  return {
    budgetTier,
    gamingGoal,
    setupStyle,
    beginnerMode,
    selectedGames,
    setup,
    loading,
    error,
    quiz,
    isComplete,
    hasSetup,
    toggleGame,
    removeGame,
    isGameSelected,
    generate,
    save,
    reset,
    persist,
  }
})
