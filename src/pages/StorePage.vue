<script setup>
/**
 * The shop. Filter sidebar on the left, product grid on the right - the Store
 * Page layout from the Figma.
 *
 * Filters live in the URL query, so a filtered view is linkable and the back
 * button behaves. The footer links to /shop?category=gpu for exactly this reason.
 */

import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProducts } from '../services/api.js'
import ProductCard from '../components/ProductCard.vue'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const route = useRoute()
const router = useRouter()

const products = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')

// Seeded from the URL so a shared link lands on the same view.
const search = ref(route.query.q || '')
const category = ref(route.query.category || '')
const kind = ref(route.query.kind || '')
const maxPrice = ref(route.query.max || '')
const sort = ref(route.query.sort || 'name')

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'tier', label: 'Performance tier' },
]

const partCategories = computed(() => categories.value.filter((c) => c.kind === 'part'))
const accessoryCategories = computed(() => categories.value.filter((c) => c.kind === 'accessory'))

const hasFilters = computed(
  () => Boolean(search.value || category.value || kind.value || maxPrice.value)
)

const CATEGORY_LABELS = {
  cpu: 'CPUs',
  gpu: 'Graphics Cards',
  ram: 'Memory',
  storage: 'Storage',
  case: 'Cases',
  monitor: 'Monitors',
  keyboard: 'Keyboards',
  mouse: 'Mice',
  headset: 'Headsets',
  microphone: 'Microphones',
  webcam: 'Webcams',
  lighting: 'Lighting',
  desk: 'Desk',
}

const labelFor = (value) => CATEGORY_LABELS[value] || value

let timer = null

async function load() {
  loading.value = true
  error.value = ''

  try {
    const data = await getProducts({
      q: search.value,
      category: category.value,
      kind: kind.value,
      max: maxPrice.value,
      sort: sort.value,
    })
    products.value = data.products
    // The category counts do not change with the filters, so only take them once.
    if (!categories.value.length) categories.value = data.categories
  } catch (err) {
    error.value = err.message
    products.value = []
  } finally {
    loading.value = false
  }
}

/** Keep the URL in step with the filters, without stacking history entries. */
function syncUrl() {
  const query = {}
  if (search.value) query.q = search.value
  if (category.value) query.category = category.value
  if (kind.value) query.kind = kind.value
  if (maxPrice.value) query.max = maxPrice.value
  if (sort.value !== 'name') query.sort = sort.value

  router.replace({ query })
}

// Debounced, so typing in the search box is one request, not one per keystroke.
watch([search, category, kind, maxPrice, sort], () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    syncUrl()
    load()
  }, 250)
})

// The footer's category links change the query without remounting the page.
watch(
  () => route.query,
  (query) => {
    if ((query.category || '') !== category.value) category.value = query.category || ''
    if ((query.kind || '') !== kind.value) kind.value = query.kind || ''
  }
)

function selectCategory(value) {
  category.value = category.value === value ? '' : value
  kind.value = ''
}

function clearFilters() {
  search.value = ''
  category.value = ''
  kind.value = ''
  maxPrice.value = ''
}

onMounted(load)
</script>

<template>
  <div class="store section container">
    <div class="section-head">
      <span class="eyebrow">Shop</span>
      <h1>Every part, and everything around it</h1>
      <p>
        The same catalog MyRig recommends from - so anything the quiz suggests, you can
        actually put in the cart.
      </p>
    </div>

    <div class="layout">
      <!-- Filter sidebar -->
      <aside class="filters">
        <div class="filter-block">
          <label class="filter-label" for="store-search">Search</label>
          <input
            id="store-search"
            v-model="search"
            class="input"
            type="search"
            placeholder="RTX, keyboard, 1440p..."
          />
        </div>

        <div class="filter-block">
          <h2 class="filter-label">PC parts</h2>
          <ul class="cat-list">
            <li v-for="item in partCategories" :key="item.category">
              <button
                type="button"
                class="cat"
                :class="{ active: category === item.category }"
                @click="selectCategory(item.category)"
              >
                <span>{{ labelFor(item.category) }}</span>
                <span class="count">{{ item.count }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="filter-block">
          <h2 class="filter-label">Accessories</h2>
          <ul class="cat-list">
            <li v-for="item in accessoryCategories" :key="item.category">
              <button
                type="button"
                class="cat"
                :class="{ active: category === item.category }"
                @click="selectCategory(item.category)"
              >
                <span>{{ labelFor(item.category) }}</span>
                <span class="count">{{ item.count }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="filter-block">
          <label class="filter-label" for="store-max">
            Max price
            <span v-if="maxPrice" class="max-value">${{ maxPrice }}</span>
          </label>
          <input
            id="store-max"
            v-model="maxPrice"
            class="range"
            type="range"
            min="0"
            max="900"
            step="25"
          />
        </div>

        <button v-if="hasFilters" class="btn btn-ghost clear" @click="clearFilters">
          Clear filters
        </button>
      </aside>

      <!-- Results -->
      <section class="results">
        <div class="results-head row-between">
          <p class="muted">
            <template v-if="!loading">{{ products.length }} products</template>
          </p>

          <label class="sort">
            <span class="muted">Sort</span>
            <select v-model="sort" class="input select">
              <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <LoadingState v-if="loading" message="Loading the store..." />

        <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />

        <div v-else-if="!products.length" class="card empty">
          <h2>Nothing matches those filters</h2>
          <p class="muted">Try widening the price range, or clearing the search.</p>
          <button class="btn" @click="clearFilters">Clear filters</button>
        </div>

        <div v-else class="grid product-grid">
          <ProductCard v-for="product in products" :key="product.id" :product="product" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--space-6);
  align-items: start;
}

/* ---------- Filters ---------- */
.filters {
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.filter-label {
  display: block;
  margin-bottom: var(--space-3);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.cat-list {
  display: grid;
  gap: 2px;
  padding: 0;
  list-style: none;
}

.cat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
}

.cat:hover {
  background: var(--surface-light);
}

.cat.active {
  background: var(--secondary-soft);
  color: var(--secondary);
  font-weight: 600;
}

.count {
  color: var(--muted);
  font-size: 0.75rem;
}

.cat.active .count {
  color: var(--secondary);
}

.max-value {
  float: right;
  color: var(--secondary);
}

.range {
  width: 100%;
  accent-color: var(--primary);
}

.clear {
  padding: 9px 14px;
  font-size: 0.875rem;
}

/* ---------- Results ---------- */
.results-head {
  margin-bottom: var(--space-4);
}

.sort {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
}

.select {
  width: auto;
  padding: 8px 12px;
}

.product-grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.empty {
  text-align: center;
  padding: var(--space-7);
}

.empty p {
  margin: var(--space-3) 0 var(--space-5);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .filters {
    position: static;
  }
}
</style>
