<script setup>
/**
 * "Select your PC parts" - the Builder page from the Figma.
 *
 * A tile per category. Pick a part in each, watch the total climb, then add the
 * whole thing to the cart. This is the manual counterpart to the quiz: the quiz
 * decides for you, the builder lets you decide.
 */

import { computed, ref, onMounted } from 'vue'
import { getProducts } from '../services/api.js'
import { useCartStore } from '../stores/cartStore.js'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const cart = useCartStore()

const products = ref([])
const loading = ref(true)
const error = ref('')

/** The nine slots of a complete setup, in the order you would actually buy them. */
const SLOTS = [
  { category: 'cpu', label: 'Processor', hint: 'The brain of the machine' },
  { category: 'gpu', label: 'Graphics Card', hint: 'What decides how games look and run' },
  { category: 'ram', label: 'Memory', hint: '16GB is the comfortable minimum' },
  { category: 'storage', label: 'Storage', hint: 'Where your games live' },
  { category: 'case', label: 'Case', hint: 'Airflow, and the look of the build' },
  { category: 'monitor', label: 'Monitor', hint: 'The part you actually stare at' },
  { category: 'keyboard', label: 'Keyboard', hint: 'You touch this every session' },
  { category: 'mouse', label: 'Mouse', hint: 'Aim lives here' },
  { category: 'headset', label: 'Headset', hint: 'Footsteps, comms, everything' },
]

/** category -> chosen product id */
const chosen = ref({})

const optionsFor = (category) => products.value.filter((p) => p.category === category)

const selected = computed(() =>
  Object.values(chosen.value)
    .map((id) => products.value.find((p) => p.id === id))
    .filter(Boolean)
)

const total = computed(() => selected.value.reduce((sum, p) => sum + p.price, 0))

const complete = computed(() => SLOTS.every((slot) => chosen.value[slot.category]))

const filledCount = computed(() => selected.value.length)

function choose(category, id) {
  // Selecting the same part again clears the slot.
  const next = { ...chosen.value }
  if (next[category] === id) {
    delete next[category]
  } else {
    next[category] = id
  }
  chosen.value = next
}

function addAllToCart() {
  cart.addMany(selected.value)
}

function reset() {
  chosen.value = {}
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    const data = await getProducts({ sort: 'price_asc' })
    products.value = data.products
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="builder section container">
    <div class="section-head text-center">
      <span class="eyebrow">Custom build</span>
      <h1>Select your PC parts</h1>
      <p class="centered">
        Choose a part in each slot and MyRig keeps a running total. Want it decided for you
        instead? <RouterLink to="/quiz">Take the setup quiz</RouterLink>.
      </p>
    </div>

    <LoadingState v-if="loading" message="Loading parts..." />

    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />

    <template v-else>
      <div class="slots">
        <section
          v-for="slot in SLOTS"
          :key="slot.category"
          class="slot"
          :class="{ filled: chosen[slot.category] }"
        >
          <header class="slot-head">
            <div>
              <h2 class="slot-title">{{ slot.label }}</h2>
              <p class="muted slot-hint">{{ slot.hint }}</p>
            </div>
            <span v-if="chosen[slot.category]" class="check" aria-hidden="true">✓</span>
          </header>

          <ul class="options">
            <li v-for="option in optionsFor(slot.category)" :key="option.id">
              <button
                type="button"
                class="option"
                :class="{ active: chosen[slot.category] === option.id }"
                :aria-pressed="chosen[slot.category] === option.id"
                @click="choose(slot.category, option.id)"
              >
                <span class="option-name">{{ option.name }}</span>
                <span class="option-price price">${{ option.price }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <!-- The running total, pinned so it is always visible while you pick. -->
      <aside class="summary" :class="{ ready: complete }">
        <div class="summary-inner container">
          <div class="summary-progress">
            <span class="summary-count">{{ filledCount }}/{{ SLOTS.length }}</span>
            <span class="muted">parts selected</span>
          </div>

          <div class="summary-total">
            <span class="muted">Build total</span>
            <span class="price total">${{ total }}</span>
          </div>

          <div class="summary-actions">
            <button v-if="filledCount" class="btn btn-ghost" @click="reset">Reset</button>
            <button class="btn" :disabled="!filledCount" @click="addAllToCart">
              Add {{ filledCount || '' }} to cart
            </button>
          </div>
        </div>
      </aside>
    </template>
  </div>
</template>

<style scoped>
.centered {
  margin-inline: auto;
}

.slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  padding-bottom: 120px; /* room for the pinned summary bar */
}

.slot {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: border-color 0.15s ease;
}

.slot.filled {
  border-color: rgba(34, 211, 238, 0.4);
}

.slot-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.slot-title {
  font-size: 1rem;
}

.slot-hint {
  font-size: 0.8125rem;
  margin-top: 2px;
}

.check {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 50%;
  background: var(--secondary);
  color: #06202a;
  font-weight: 800;
  font-size: 0.8125rem;
}

.options {
  display: grid;
  gap: 6px;
  padding: 0;
  list-style: none;
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  padding: 10px 12px;
  background: var(--surface-light);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.option:hover {
  border-color: var(--border-strong);
}

.option.active {
  border-color: var(--secondary);
  background: var(--secondary-soft);
}

.option.active .option-name {
  color: var(--secondary);
  font-weight: 600;
}

.option-price {
  flex: none;
  color: var(--muted);
}

.option.active .option-price {
  color: var(--secondary);
}

/* ---------- Pinned summary ---------- */
.summary {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding-block: var(--space-4);
  background: rgba(17, 24, 39, 0.94);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
}

.summary.ready {
  border-top-color: rgba(34, 211, 238, 0.5);
  box-shadow: 0 -8px 40px rgba(34, 211, 238, 0.12);
}

.summary-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.summary-progress {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 0.875rem;
}

.summary-count {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--secondary);
}

.summary-total {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.total {
  font-size: 1.75rem;
}

.summary-actions {
  display: flex;
  gap: var(--space-3);
}

@media (max-width: 700px) {
  .summary-inner {
    justify-content: center;
    text-align: center;
  }
}
</style>
