<script setup>
import { computed } from 'vue'

const props = defineProps({
  build: { type: Object, required: true }, // a row from saved_builds
})

defineEmits(['delete'])

const GOAL_LABELS = {
  competitive_fps: 'Competitive FPS',
  high_graphics: 'High graphics',
  casual: 'Casual gaming',
  streaming: 'Streaming / content',
  balanced: 'Balanced everything',
}

const STYLE_LABELS = {
  rgb: 'RGB gamer',
  minimalist: 'Minimalist black',
  white: 'White clean',
  cozy: 'Cozy',
  streamer: 'Streamer',
  esports: 'Esports',
}

const BUDGET_LABELS = {
  budget: 'Budget (under $900)',
  balanced: 'Balanced ($900-$1500)',
  high: 'High-end ($1500+)',
}

const created = computed(() =>
  new Date(props.build.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
)

/** scores is stored as JSONB - it comes back as the array the engine produced. */
const overall = computed(() => {
  const scores = props.build.scores
  if (!Array.isArray(scores) || !scores.length) return null
  return Math.round(scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length)
})

const games = computed(() => props.build.selected_games || [])
const items = computed(() => props.build.recommended_items || [])

/** The parts worth naming on a summary card - nobody scans for the RAM here. */
const headlineItems = computed(() =>
  items.value.filter((i) => ['cpu', 'gpu', 'monitor'].includes(i.category))
)
</script>

<template>
  <article class="build-card" :data-style="build.setup_style">
    <header class="head">
      <div>
        <h3 class="name">{{ build.build_name }}</h3>
        <p class="muted created">Saved {{ created }}</p>
      </div>
      <div v-if="overall !== null" class="overall">
        <span class="overall-number">{{ overall }}</span>
        <span class="overall-label">score</span>
      </div>
    </header>

    <div class="tags">
      <span class="tag tag-neutral">{{ BUDGET_LABELS[build.budget_tier] }}</span>
      <span class="tag tag-neutral">{{ GOAL_LABELS[build.gaming_goal] }}</span>
      <span class="tag">{{ STYLE_LABELS[build.setup_style] }}</span>
      <span v-if="build.beginner_mode" class="tag tag-neutral">Beginner mode</span>
    </div>

    <dl class="facts">
      <div class="fact">
        <dt>Total</dt>
        <dd class="price total">${{ build.total_cost }}</dd>
      </div>
      <div class="fact">
        <dt>Items</dt>
        <dd>{{ items.length }}</dd>
      </div>
      <div class="fact">
        <dt>Games</dt>
        <dd>{{ games.length }}</dd>
      </div>
      <div class="fact">
        <dt>Upgrades</dt>
        <dd>{{ (build.upgrade_path || []).length }}</dd>
      </div>
    </dl>

    <ul v-if="headlineItems.length" class="headline">
      <li v-for="item in headlineItems" :key="item.category">
        <span class="muted cat">{{ item.category.toUpperCase() }}</span>
        <span>{{ item.name }}</span>
      </li>
    </ul>

    <p v-if="games.length" class="muted games">
      For: {{ games.map((g) => g.name).join(', ') }}
    </p>

    <footer class="foot">
      <button class="btn btn-danger" @click="$emit('delete', build)">Delete build</button>
    </footer>
  </article>
</template>

<style scoped>
.build-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.build-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--accent-a, var(--primary)),
    var(--accent-b, var(--secondary))
  );
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.name {
  font-size: 1.125rem;
}

.created {
  font-size: 0.8125rem;
  margin-top: 2px;
}

.overall {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px;
  background: var(--surface-light);
  border-radius: var(--radius-sm);
}

.overall-number {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--secondary);
}

.overall-label {
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--space-4);
}

.facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-block: 1px solid var(--border);
  margin: 0;
}

.fact dt {
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.fact dd {
  margin: 2px 0 0;
  font-weight: 600;
}

.total {
  color: var(--secondary);
}

.headline {
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.headline li {
  display: flex;
  gap: var(--space-3);
  font-size: 0.875rem;
}

.cat {
  flex: none;
  width: 62px;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
}

.games {
  margin-top: var(--space-4);
  font-size: 0.8125rem;
}

.foot {
  margin-top: auto;
  padding-top: var(--space-4);
}

.foot .btn {
  padding: 8px 16px;
  font-size: 0.875rem;
}
</style>
