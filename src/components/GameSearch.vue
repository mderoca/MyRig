<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { searchGames } from '../services/api.js'
import { useSetupStore } from '../stores/setupStore.js'
import LoadingState from './LoadingState.vue'
import ErrorMessage from './ErrorMessage.vue'

const store = useSetupStore()

const query = ref('')
const results = ref([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)

const SUGGESTIONS = [
  'Valorant',
  'Fortnite',
  'Minecraft',
  'Cyberpunk 2077',
  'Elden Ring',
  'Call of Duty',
  'League of Legends',
  'GTA V',
]

let timer = null

/** Waits until typing stops before hitting the API - one request per search,
 *  not one per keystroke. RAWG rate-limits free keys. */
watch(query, (value) => {
  clearTimeout(timer)
  error.value = ''

  if (value.trim().length < 2) {
    results.value = []
    searched.value = false
    return
  }

  timer = setTimeout(() => runSearch(value.trim()), 400)
})

onBeforeUnmount(() => clearTimeout(timer))

async function runSearch(term) {
  loading.value = true
  error.value = ''

  try {
    results.value = await searchGames(term)
    searched.value = true
  } catch (err) {
    error.value = err.message
    results.value = []
  } finally {
    loading.value = false
  }
}

function searchFor(term) {
  query.value = term
}
</script>

<template>
  <div class="game-search">
    <label class="label" for="game-query">Search for the games you actually play</label>
    <input
      id="game-query"
      v-model="query"
      class="input"
      type="search"
      placeholder="Try Valorant, Elden Ring, Minecraft..."
      autocomplete="off"
    />

    <div class="suggestions">
      <span class="muted small">Popular:</span>
      <button
        v-for="name in SUGGESTIONS"
        :key="name"
        type="button"
        class="suggestion"
        @click="searchFor(name)"
      >
        {{ name }}
      </button>
    </div>

    <LoadingState v-if="loading" message="Searching RAWG..." />

    <ErrorMessage
      v-else-if="error"
      :message="error"
      retryable
      @retry="runSearch(query.trim())"
    />

    <p v-else-if="searched && !results.length" class="muted empty">
      No games matched "{{ query }}". Try a shorter search.
    </p>

    <ul v-else-if="results.length" class="results">
      <li v-for="game in results" :key="game.id">
        <button
          type="button"
          class="game-card"
          :class="{ selected: store.isGameSelected(game.id) }"
          :aria-pressed="store.isGameSelected(game.id)"
          @click="store.toggleGame(game)"
        >
          <div class="thumb">
            <img
              v-if="game.image"
              :src="game.image"
              :alt="game.name"
              loading="lazy"
              width="320"
              height="180"
            />
            <div v-else class="thumb-placeholder" aria-hidden="true">MyRig</div>
            <span v-if="store.isGameSelected(game.id)" class="check" aria-hidden="true">✓</span>
          </div>

          <div class="game-body">
            <h4 class="game-name">{{ game.name }}</h4>
            <div class="game-meta">
              <span v-if="game.rating" class="tag tag-neutral">★ {{ game.rating }}</span>
              <span v-for="genre in game.genres.slice(0, 2)" :key="genre" class="tag tag-neutral">
                {{ genre }}
              </span>
            </div>
          </div>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.small {
  font-size: 0.8125rem;
}

.suggestion {
  padding: 4px 10px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.suggestion:hover {
  color: var(--secondary);
  border-color: var(--secondary);
}

.empty {
  padding-block: var(--space-5);
}

.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-top: var(--space-5);
  padding: 0;
  list-style: none;
}

.game-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  text-align: left;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}

.game-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
}

/* Cyan = selected. Used consistently across the whole app. */
.game-card.selected {
  border-color: var(--secondary);
  box-shadow: var(--glow-secondary);
}

.thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 0.875rem;
}

.check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--secondary);
  color: #06202a;
  font-weight: 800;
  font-size: 0.875rem;
}

.game-body {
  padding: var(--space-3);
}

.game-name {
  font-size: 0.9375rem;
  margin-bottom: var(--space-2);
}

.game-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
