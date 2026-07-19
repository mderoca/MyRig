<script setup>
/**
 * "Can I Run It?" - the page from the Figma.
 *
 * Search a real game (IGDB), and MyRig works out what it needs and what that
 * costs, using the same engine the quiz uses. This is the clearest expression of
 * the game-first idea: the game decides the build.
 */

import { ref, watch, onBeforeUnmount } from 'vue'
import { searchGames, canIRun } from '../services/api.js'
import { useCartStore } from '../stores/cartStore.js'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const cart = useCartStore()

const query = ref('')
const results = ref([])
const searching = ref(false)

const result = ref(null)
const loading = ref(false)
const error = ref('')

/** 'minimum' | 'recommended' - which build the cards are showing. */
const shown = ref('recommended')

const SUGGESTIONS = ['Cyberpunk 2077', 'Valorant', 'Elden Ring', 'Minecraft', 'Fortnite']

let timer = null

watch(query, (value) => {
  clearTimeout(timer)

  if (value.trim().length < 2) {
    results.value = []
    return
  }

  timer = setTimeout(async () => {
    searching.value = true
    try {
      results.value = await searchGames(value.trim())
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 400)
})

onBeforeUnmount(() => clearTimeout(timer))

async function check(game) {
  query.value = ''
  results.value = []
  loading.value = true
  error.value = ''
  result.value = null

  try {
    result.value = await canIRun(game.id)
    shown.value = 'recommended'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const build = () => result.value?.builds[shown.value]

function addBuildToCart() {
  const current = build()
  if (current) cart.addMany(current.items.map((item) => ({ ...item, id: item.id })))
}
</script>

<template>
  <div class="cir section container">
    <div class="section-head text-center">
      <span class="eyebrow">Can I run it?</span>
      <h1>Pick a game. See what it takes.</h1>
      <p class="centered">
        MyRig reads the game's genres and tags from IGDB, works out whether it needs frames
        or fidelity, and builds the rig that runs it.
      </p>
    </div>

    <!-- Search -->
    <div class="search-card card">
      <label class="label" for="cir-search">Search for a game</label>
      <input
        id="cir-search"
        v-model="query"
        class="input"
        type="search"
        placeholder="Cyberpunk 2077, Valorant, Elden Ring..."
        autocomplete="off"
      />

      <div class="suggestions">
        <span class="muted small">Try:</span>
        <button
          v-for="name in SUGGESTIONS"
          :key="name"
          type="button"
          class="suggestion"
          @click="query = name"
        >
          {{ name }}
        </button>
      </div>

      <p v-if="searching" class="muted small searching">Searching IGDB...</p>

      <ul v-if="results.length" class="results">
        <li v-for="game in results.slice(0, 6)" :key="game.id">
          <button type="button" class="result" @click="check(game)">
            <img v-if="game.image" :src="game.image" :alt="''" class="result-img" loading="lazy" />
            <span class="result-body">
              <span class="result-name">{{ game.name }}</span>
              <span class="muted small">{{ game.genres.slice(0, 3).join(', ') }}</span>
            </span>
            <span class="result-go" aria-hidden="true">→</span>
          </button>
        </li>
      </ul>
    </div>

    <LoadingState v-if="loading" message="Working out what this game needs..." />

    <ErrorMessage v-else-if="error" :message="error" />

    <!-- Verdict -->
    <template v-else-if="result">
      <section class="verdict card">
        <div class="verdict-media">
          <img v-if="result.game.image" :src="result.game.image" :alt="result.game.name" />
          <div v-else class="verdict-placeholder" aria-hidden="true">MYRIG</div>
        </div>

        <div class="verdict-body">
          <span class="eyebrow">Can you run</span>
          <h2 class="game-name">{{ result.game.name }}?</h2>

          <p class="headline">{{ result.verdict.headline }}</p>

          <div class="chips">
            <span v-for="genre in result.game.genres.slice(0, 3)" :key="genre" class="tag tag-neutral">
              {{ genre }}
            </span>
            <span v-if="result.game.rating" class="tag tag-neutral">★ {{ result.game.rating }}</span>
          </div>

          <!-- The Figma's "Build Cost Estimate" number. -->
          <div class="estimate">
            <span class="muted">Build cost estimate</span>
            <span class="estimate-price price">${{ build().total }}</span>
            <span class="muted small">Tower and monitor. Peripherals not included.</span>
          </div>

          <div class="toggle" role="group" aria-label="Build level">
            <button
              type="button"
              :class="{ active: shown === 'minimum' }"
              @click="shown = 'minimum'"
            >
              Minimum
            </button>
            <button
              type="button"
              :class="{ active: shown === 'recommended' }"
              @click="shown = 'recommended'"
            >
              Recommended
            </button>
          </div>
        </div>
      </section>

      <!-- The parts -->
      <section class="parts">
        <div class="row-between parts-head">
          <h2>{{ shown === 'minimum' ? 'The floor' : 'What you actually want' }}</h2>
          <button class="btn" @click="addBuildToCart">Add build to cart</button>
        </div>

        <p class="muted perf">{{ build().performance.explanation }}</p>

        <div class="grid part-grid">
          <article v-for="item in build().items" :key="item.category" class="part">
            <span class="part-cat">{{ item.category }}</span>
            <h3 class="part-name">{{ item.name }}</h3>
            <p class="part-reason muted">{{ item.reason }}</p>
            <div class="row-between part-foot">
              <span class="price">${{ item.price }}</span>
              <RouterLink :to="`/shop?category=${item.category}`" class="change">Change part</RouterLink>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.centered {
  margin-inline: auto;
}

.small {
  font-size: 0.8125rem;
}

/* ---------- Search ---------- */
.search-card {
  max-width: 620px;
  margin-inline: auto;
}

.label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: 600;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.suggestion {
  padding: 4px 10px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.8125rem;
  cursor: pointer;
}

.suggestion:hover {
  color: var(--secondary);
  border-color: var(--secondary);
}

.searching {
  margin-top: var(--space-3);
}

.results {
  display: grid;
  gap: 6px;
  margin-top: var(--space-4);
  padding: 0;
  list-style: none;
}

.result {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: 8px;
  background: var(--surface-light);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.result:hover {
  border-color: var(--secondary);
}

.result-img {
  width: 56px;
  height: 36px;
  flex: none;
  object-fit: cover;
  border-radius: 4px;
}

.result-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.result-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.result-go {
  color: var(--secondary);
}

/* ---------- Verdict ---------- */
.verdict {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.verdict-media img {
  width: 100%;
  height: 100%;
  min-height: 200px;
  object-fit: cover;
  border-radius: var(--radius);
}

.verdict-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 200px;
  border-radius: var(--radius);
  background: var(--surface-light);
  color: var(--muted);
  font-family: var(--font-display);
  letter-spacing: 0.1em;
}

.game-name {
  margin-bottom: var(--space-3);
}

.headline {
  color: var(--text);
  font-size: 1.0625rem;
  max-width: 52ch;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--space-4);
}

.estimate {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: var(--surface-light);
  border-radius: var(--radius);
}

.estimate-price {
  font-size: 2.25rem;
  color: var(--secondary);
  line-height: 1.1;
}

.toggle {
  display: inline-flex;
  gap: 4px;
  margin-top: var(--space-4);
  padding: 4px;
  background: var(--surface-light);
  border-radius: 999px;
}

.toggle button {
  padding: 8px 18px;
  background: transparent;
  border: none;
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.toggle button.active {
  background: var(--primary);
  color: #fff;
}

/* ---------- Parts ---------- */
.parts {
  margin-top: var(--space-7);
}

.parts-head {
  margin-bottom: var(--space-3);
}

.perf {
  margin-bottom: var(--space-5);
  max-width: 70ch;
}

.part-grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.part {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.part-cat {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--secondary);
}

.part-name {
  margin: var(--space-2) 0;
  font-size: 1rem;
}

.part-reason {
  flex: 1;
  font-size: 0.875rem;
}

.part-foot {
  margin-top: var(--space-4);
}

.change {
  font-size: 0.8125rem;
}

@media (max-width: 800px) {
  .verdict {
    grid-template-columns: 1fr;
  }
}
</style>
