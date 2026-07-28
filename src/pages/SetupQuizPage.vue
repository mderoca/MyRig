<script setup>
/**
 * The quiz. Four inputs (budget, goal, style, beginner mode) plus game selection,
 * then POST /api/recommend and move to the recommendation page.
 */

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  useSetupStore,
  BUDGET_OPTIONS,
  GOAL_OPTIONS,
  STYLE_OPTIONS,
} from '../stores/setupStore.js'
import { getProducts } from '../services/api.js'
import GameSearch from '../components/GameSearch.vue'
import SelectedGames from '../components/SelectedGames.vue'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const store = useSetupStore()
const router = useRouter()

// Shop photos shown on the budget and style options. Purely illustrative -
// if the catalog fails to load, the quiz works exactly as before, just plainer.
const products = ref([])

onMounted(async () => {
  try {
    products.value = (await getProducts()).products || []
  } catch {
    // Images are decoration; the quiz must not break over them.
  }
})

/** The part tier each budget lands on (same mapping the engine uses). */
const TIER_OF_BUDGET = { budget: 'budget', balanced: 'mid', high: 'high' }

/** A few representative shop photos for what this budget buys. */
function budgetSamples(budget) {
  const tier = TIER_OF_BUDGET[budget]
  const samples = []
  for (const category of ['gpu', 'case', 'monitor']) {
    const hit = products.value.find(
      (p) => p.image_url && p.tier === tier && p.category === category
    )
    if (hit) samples.push(hit)
  }
  return samples
}

/** One shop photo that captures the style - the case sets the look of a setup. */
function styleImage(style) {
  const pool = products.value.filter(
    (p) => p.image_url && Array.isArray(p.styles) && p.styles.includes(style)
  )
  return (pool.find((p) => p.category === 'case') || pool[0])?.image_url || null
}

async function generate() {
  const ok = await store.generate()
  if (ok) router.push({ name: 'recommendation' })
}

/** Persist on every choice so a refresh mid-quiz does not lose the answers. */
function choose(field, value) {
  store[field] = value
  store.persist()
}
</script>

<template>
  <div class="quiz section container">
    <div class="section-head">
      <span class="eyebrow">Setup quiz</span>
      <h1>Tell MyRig what you play</h1>
      <p>
        Four questions. Your games decide what the build needs to be good at, your budget
        decides how far it can go, and your style decides what it looks like on the desk.
      </p>
    </div>

    <form class="stack form" @submit.prevent="generate">
      <!-- 1. Budget ------------------------------------------------------ -->
      <fieldset class="card step">
        <legend class="step-legend">
          <span class="step-num">1</span>
          <span>
            <h2>What is your budget?</h2>
            <p class="muted">This covers the whole setup - tower, screen and desk.</p>
          </span>
        </legend>

        <div class="options options-3">
          <label
            v-for="option in BUDGET_OPTIONS"
            :key="option.value"
            class="option"
            :class="{ active: store.budgetTier === option.value }"
          >
            <input
              type="radio"
              name="budget"
              :value="option.value"
              :checked="store.budgetTier === option.value"
              @change="choose('budgetTier', option.value)"
            />
            <span class="option-label">{{ option.label }}</span>
            <span class="option-detail">{{ option.detail }}</span>
            <span class="option-blurb muted">{{ option.blurb }}</span>
            <span v-if="budgetSamples(option.value).length" class="option-photos">
              <img
                v-for="product in budgetSamples(option.value)"
                :key="product.id"
                :src="product.image_url"
                :alt="product.name"
                :title="product.name"
                loading="lazy"
              />
            </span>
          </label>
        </div>
      </fieldset>

      <!-- 2. Gaming goal -------------------------------------------------- -->
      <fieldset class="card step">
        <legend class="step-legend">
          <span class="step-num">2</span>
          <span>
            <h2>What matters most when you play?</h2>
            <p class="muted">This decides where the money goes inside the build.</p>
          </span>
        </legend>

        <div class="options options-3">
          <label
            v-for="option in GOAL_OPTIONS"
            :key="option.value"
            class="option"
            :class="{ active: store.gamingGoal === option.value }"
          >
            <input
              type="radio"
              name="goal"
              :value="option.value"
              :checked="store.gamingGoal === option.value"
              @change="choose('gamingGoal', option.value)"
            />
            <span class="option-label">{{ option.label }}</span>
            <span class="option-blurb muted">{{ option.blurb }}</span>
          </label>
        </div>
      </fieldset>

      <!-- 3. Setup style -------------------------------------------------- -->
      <fieldset class="card step">
        <legend class="step-legend">
          <span class="step-num">3</span>
          <span>
            <h2>What should the setup look like?</h2>
            <p class="muted">Style changes the case, the peripherals and the lighting.</p>
          </span>
        </legend>

        <div class="options options-3">
          <label
            v-for="option in STYLE_OPTIONS"
            :key="option.value"
            class="option style-option"
            :class="{ active: store.setupStyle === option.value }"
            :data-style="option.value"
          >
            <input
              type="radio"
              name="style"
              :value="option.value"
              :checked="store.setupStyle === option.value"
              @change="choose('setupStyle', option.value)"
            />
            <span class="style-swatch" aria-hidden="true"></span>
            <img
              v-if="styleImage(option.value)"
              class="style-photo"
              :src="styleImage(option.value)"
              :alt="`${option.label} example from the shop`"
              loading="lazy"
            />
            <span class="option-label">{{ option.label }}</span>
            <span class="option-blurb muted">{{ option.blurb }}</span>
          </label>
        </div>
      </fieldset>

      <!-- 4. Games -------------------------------------------------------- -->
      <fieldset class="card step">
        <legend class="step-legend">
          <span class="step-num">4</span>
          <span>
            <h2>Which games do you play?</h2>
            <p class="muted">
              Optional, but this is the part that makes MyRig different. Searches the real
              IGDB game database.
            </p>
          </span>
        </legend>

        <GameSearch />
        <hr class="divider" />
        <SelectedGames />
      </fieldset>

      <!-- Beginner mode + submit ------------------------------------------ -->
      <div class="card step">
        <label class="beginner-toggle" :class="{ active: store.beginnerMode }">
          <input
            type="checkbox"
            :checked="store.beginnerMode"
            @change="choose('beginnerMode', $event.target.checked)"
          />
          <span class="checkbox" aria-hidden="true"></span>
          <span>
            <strong>I am new to PC building</strong>
            <span class="muted block">
              Adds a plain-language explanation next to every recommended part.
            </span>
          </span>
        </label>
      </div>

      <ErrorMessage v-if="store.error" :message="store.error" />

      <LoadingState v-if="store.loading" message="Building your setup..." />

      <div v-else class="submit">
        <button type="submit" class="btn btn-lg" :disabled="!store.isComplete">
          Generate Setup
        </button>
        <p v-if="!store.isComplete" class="muted hint">
          Pick a budget, a goal and a style to continue.
        </p>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form {
  gap: var(--space-5);
}

.step {
  border: 1px solid var(--border);
}

.step-legend {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-bottom: var(--space-5);
  padding: 0;
}

.step-num {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary-soft);
  border: 1px solid rgba(124, 58, 237, 0.4);
  color: var(--primary-hover);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.875rem;
}

.step-legend h2 {
  font-size: 1.25rem;
}

.step-legend p {
  font-size: 0.9375rem;
  margin-top: 2px;
}

.options {
  display: grid;
  gap: var(--space-3);
}

.options-3 {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.option {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}

.option:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

/* Cyan = the active choice. Same language as a selected game. */
.option.active {
  border-color: var(--secondary);
  box-shadow: var(--glow-secondary);
}

.option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.option-label {
  font-family: var(--font-display);
  font-weight: 700;
}

.option.active .option-label {
  color: var(--secondary);
}

.option-detail {
  font-size: 0.875rem;
  color: var(--text);
}

.option-blurb {
  font-size: 0.8125rem;
  line-height: 1.5;
}

/* Each style option previews its own colour vibe. */
.style-swatch {
  width: 100%;
  height: 6px;
  margin-bottom: var(--space-2);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--accent-a, var(--primary)),
    var(--accent-b, var(--secondary)),
    var(--accent-c, var(--primary))
  );
}

.style-photo {
  width: 100%;
  height: 110px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}

.option-photos {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.option-photos img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
}

.divider {
  margin-block: var(--space-5);
  border: none;
  border-top: 1px solid var(--border);
}

/* Beginner checkbox */
.beginner-toggle {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.beginner-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox {
  flex: none;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: var(--surface-light);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.beginner-toggle.active .checkbox {
  background: var(--secondary);
  border-color: var(--secondary);
  box-shadow: inset 0 0 0 4px var(--surface);
}

.block {
  display: block;
  font-size: 0.875rem;
}

.submit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-4);
}

.hint {
  font-size: 0.875rem;
}
</style>
