<script setup>
/**
 * The payoff page. Everything the engine returned, in one scroll:
 * the items, the full-setup budget, the style summary, five scores,
 * the upgrade path, and a Save build action.
 */

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSetupStore } from '../stores/setupStore.js'
import { useAuthStore } from '../stores/authStore.js'
import { useCartStore } from '../stores/cartStore.js'
import RecommendationCard from '../components/RecommendationCard.vue'
import BudgetBreakdown from '../components/BudgetBreakdown.vue'
import CompatibilityPanel from '../components/CompatibilityPanel.vue'
import StyleSummary from '../components/StyleSummary.vue'
import SetupScores from '../components/SetupScores.vue'
import UpgradePath from '../components/UpgradePath.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const store = useSetupStore()
const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

const setup = computed(() => store.setup)

/** Items split into the sections the page renders. */
const GROUP_TITLES = {
  tower: 'The PC',
  monitor: 'The screen',
  peripherals: 'What you touch',
  desk: 'The desk',
}

const groupedItems = computed(() => {
  const groups = { tower: [], monitor: [], peripherals: [], desk: [] }
  for (const item of setup.value?.items || []) {
    ;(groups[item.group] || groups.desk).push(item)
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length)
    .map(([key, items]) => ({ key, title: GROUP_TITLES[key], items }))
})

// ---- Save build ----
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
const buildName = ref('')

/** A sensible default name, e.g. "Esports Balanced build". */
const defaultName = computed(() => {
  const style = setup.value?.meta.setupStyleLabel || 'Custom'
  const budget = setup.value?.meta.budgetLabel || ''
  return `${style} ${budget} build`.trim()
})

async function saveBuild() {
  // Saving needs an account. The setup itself survives the round trip, because
  // it is mirrored into localStorage - they come back to exactly this page.
  if (!auth.isSignedIn) {
    return router.push({ name: 'login', query: { redirect: '/recommendation' } })
  }

  saving.value = true
  saveError.value = ''

  try {
    await store.save(buildName.value.trim() || defaultName.value)
    saved.value = true
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
}

/** The whole setup, straight into the cart - the engine only ever recommends real products. */
function addSetupToCart() {
  cart.addMany(setup.value.items)
  router.push({ name: 'cart' })
}

function startOver() {
  store.reset()
  router.push({ name: 'quiz' })
}
</script>

<template>
  <div v-if="setup" class="recommendation" :data-style="setup.meta.setupStyle">
    <!-- Header ---------------------------------------------------------- -->
    <section class="section container">
      <div class="head">
        <div>
          <span class="eyebrow">Your setup</span>
          <h1>{{ setup.meta.setupStyleLabel }}, built for {{ setup.meta.gamingGoalLabel.toLowerCase() }}</h1>
          <p class="muted lede">
            {{ setup.items.length }} items,
            <strong class="price">${{ setup.budget.total }}</strong> total, planned against your
            {{ setup.meta.budgetLabel.toLowerCase() }} budget of ${{ setup.budget.cap }}.
          </p>

          <div class="chips">
            <span class="tag tag-neutral">{{ setup.meta.budgetRange }}</span>
            <span class="tag tag-neutral">{{ setup.meta.gamingGoalLabel }}</span>
            <span class="tag">{{ setup.meta.setupStyleLabel }}</span>
            <span v-if="setup.meta.beginnerMode" class="tag tag-neutral">Beginner mode on</span>
          </div>

          <p v-if="setup.meta.games.length" class="muted games">
            Built around: {{ setup.meta.games.map((g) => g.name).join(', ') }}
          </p>
          <p v-else class="muted games">
            No games selected - this is a general build.
            <RouterLink to="/quiz">Add your games</RouterLink> for a sharper recommendation.
          </p>
        </div>

        <div class="head-actions">
          <button class="btn" @click="addSetupToCart">Add setup to cart</button>
          <button class="btn btn-ghost" @click="startOver">Start over</button>
        </div>
      </div>
    </section>

    <!-- Recommended items ----------------------------------------------- -->
    <section class="section container">
      <div class="section-head">
        <span class="eyebrow">Recommended setup</span>
        <h2>Everything you need, and why</h2>
        <p>
          Each card says what it is, what it costs, and the reason MyRig picked it for
          <em>your</em> answers.
        </p>
      </div>

      <div v-for="group in groupedItems" :key="group.key" class="item-group">
        <h3 class="group-title">{{ group.title }}</h3>
        <div class="grid grid-3">
          <RecommendationCard v-for="item in group.items" :key="item.name" :item="item" />
        </div>
      </div>
    </section>

    <!-- Compatibility ---------------------------------------------------- -->
    <!-- Directly under the parts list, because "do these actually fit
         together?" is the first question anyone asks about a build. -->
    <section v-if="setup.compatibility" class="section container">
      <CompatibilityPanel :compatibility="setup.compatibility" />
    </section>

    <!-- Budget ----------------------------------------------------------- -->
    <section class="section container">
      <BudgetBreakdown :budget="setup.budget" />
    </section>

    <!-- Style summary ---------------------------------------------------- -->
    <section class="section container">
      <StyleSummary :summary="setup.styleSummary" />
    </section>

    <!-- Scores ----------------------------------------------------------- -->
    <section class="section container">
      <SetupScores :scores="setup.scores" />
    </section>

    <!-- Upgrade path ----------------------------------------------------- -->
    <section v-if="setup.upgradePath.length" class="section container">
      <UpgradePath :upgrades="setup.upgradePath" />
    </section>

    <!-- Save ------------------------------------------------------------- -->
    <section class="section container">
      <div class="card save">
        <template v-if="!saved">
          <h2>Save this build</h2>
          <p class="muted">
            Kept against your account, with the parts, scores and upgrade path exactly as
            they are now. Come back any time and it will be in
            <RouterLink to="/builds">Saved Builds</RouterLink>.
          </p>

          <div class="save-row">
            <input
              v-model="buildName"
              class="input"
              type="text"
              :placeholder="defaultName"
              maxlength="80"
              aria-label="Build name"
            />
            <button class="btn" :disabled="saving" @click="saveBuild">
              {{ saving ? 'Saving...' : auth.isSignedIn ? 'Save Build' : 'Sign in to save' }}
            </button>
          </div>

          <p v-if="!auth.isSignedIn" class="muted small">
            Your setup is kept while you sign in - you will land right back here.
          </p>

          <ErrorMessage v-if="saveError" :message="saveError" class="save-error" />
        </template>

        <template v-else>
          <h2 class="saved-title">Saved.</h2>
          <p class="muted">Your build is in the database.</p>
          <div class="row saved-actions">
            <RouterLink to="/builds" class="btn">View saved builds</RouterLink>
            <button class="btn btn-ghost" @click="startOver">Plan another setup</button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
}

.lede {
  margin-top: var(--space-3);
}

.lede strong {
  color: var(--secondary);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--space-4);
}

.games {
  margin-top: var(--space-3);
  font-size: 0.875rem;
}

.head-actions {
  flex: none;
}

.item-group + .item-group {
  margin-top: var(--space-6);
}

.group-title {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.8125rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.save {
  text-align: center;
  background: linear-gradient(140deg, rgba(124, 58, 237, 0.16), rgba(34, 211, 238, 0.06));
  border-color: rgba(124, 58, 237, 0.3);
  padding: var(--space-7);
}

.save p {
  margin: var(--space-3) auto 0;
  max-width: 52ch;
}

.save-row {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  max-width: 520px;
  margin: var(--space-5) auto 0;
}

.save-row .btn {
  flex: none;
}

.save-error {
  margin-top: var(--space-4);
  text-align: left;
}

.small {
  font-size: 0.8125rem;
  margin-top: var(--space-3);
}

.saved-title {
  color: var(--success);
}

.saved-actions {
  justify-content: center;
  margin-top: var(--space-5);
}

@media (max-width: 700px) {
  .head {
    flex-direction: column;
  }

  .save-row {
    flex-direction: column;
  }
}
</style>
