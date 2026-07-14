<script setup>
/**
 * The landing page, following the Figma homepage: a hero with copy left and art
 * right, a "Don't know where to start?" band, popular pre-builts, and the
 * differentiator section.
 */

import { ref, onMounted } from 'vue'
import { getProducts } from '../services/api.js'
import ProductCard from '../components/ProductCard.vue'
import LoadingState from '../components/LoadingState.vue'

const featured = ref([])
const loading = ref(true)

const PATHS = [
  {
    to: '/quiz',
    eyebrow: 'Not sure what you need',
    title: 'Take the setup quiz',
    body: 'Answer four questions about your games, budget and style. Get a whole setup, scored, with an upgrade path.',
    cta: 'Start the quiz',
  },
  {
    to: '/can-i-run-it',
    eyebrow: 'Got one game in mind',
    title: 'Can I run it?',
    body: 'Search a real game. MyRig reads what it needs and tells you what the rig costs.',
    cta: 'Check a game',
  },
  {
    to: '/custom',
    eyebrow: 'Know what you want',
    title: 'Build it yourself',
    body: 'Pick every part yourself and watch the total as you go.',
    cta: 'Open the builder',
  },
]

const DIFFERENTIATORS = [
  {
    title: 'Game-first recommendations',
    body: 'The build starts from the games you actually play. MyRig reads their genres and tags from RAWG - a Valorant player and an Elden Ring player get different rigs at the same budget.',
  },
  {
    title: 'Full setup budget',
    body: 'Your budget covers the whole desk, not just the tower. Monitor, keyboard, mouse, headset and accessories are planned inside the number you picked.',
  },
  {
    title: 'Setup style picker',
    body: 'RGB, minimalist, white, cozy, streamer or esports. The style changes the case, the peripherals and the lighting - not just a colour swatch.',
  },
  {
    title: 'Beginner learning area',
    body: 'Never built a PC? Turn on beginner mode and every recommendation comes with a plain-language explanation of what the part does.',
  },
  {
    title: 'Setup scores',
    body: 'Five scores out of 100 - performance, budget balance, style match, upgradeability, completeness - each with the reasoning written out.',
  },
  {
    title: 'Upgrade path',
    body: 'A setup is not one purchase. MyRig tells you what to buy next, in what order, roughly what it costs, and why it matters for your build.',
  },
]

onMounted(async () => {
  try {
    // A few high-tier parts as the "popular" rail. Not a real popularity metric -
    // there is no order-count query behind this, and pretending otherwise would be a lie.
    const data = await getProducts({ kind: 'part', sort: 'tier' })
    featured.value = data.products.slice(0, 4)
  } catch {
    featured.value = [] // the store being down should not take the homepage with it
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero container">
      <div class="hero-copy">
        <span class="eyebrow">Gaming setup planner &amp; store</span>
        <h1 class="hero-title">Design the rig<br />that fits you.</h1>

        <p class="lede">
          Most build tools start with parts. MyRig starts with you - the games in your
          library, the money you actually have, and the desk you want to sit at. Get a
          complete setup, then buy it in one place.
        </p>

        <div class="hero-actions">
          <RouterLink to="/quiz" class="btn btn-lg">Start Setup Quiz</RouterLink>
          <RouterLink to="/shop" class="btn btn-ghost btn-lg">Browse the shop</RouterLink>
        </div>

        <p class="muted hero-note">No account needed to plan. Takes about a minute.</p>
      </div>

      <div class="hero-art" aria-hidden="true">
        <div class="art-monitor">
          <div class="art-screen">
            <span class="art-line w60"></span>
            <span class="art-line w90"></span>
            <span class="art-line w40"></span>
            <div class="art-bar"><span></span></div>
          </div>
          <div class="art-stand"></div>
        </div>
        <div class="art-desk">
          <div class="art-tower"></div>
          <div class="art-keyboard"></div>
          <div class="art-mouse"></div>
        </div>
        <div class="art-glow"></div>
      </div>
    </section>

    <!-- Three ways in - the Figma's "Don't Know Where To Start?" band -->
    <section class="section container">
      <div class="section-head">
        <span class="eyebrow">Don't know where to start?</span>
        <h2>Three ways in</h2>
      </div>

      <div class="grid grid-3">
        <RouterLink v-for="path in PATHS" :key="path.to" :to="path.to" class="path card">
          <span class="eyebrow">{{ path.eyebrow }}</span>
          <h3>{{ path.title }}</h3>
          <p class="muted">{{ path.body }}</p>
          <span class="path-cta">{{ path.cta }} →</span>
        </RouterLink>
      </div>
    </section>

    <!-- Featured parts -->
    <section class="section container">
      <div class="row-between section-head">
        <div>
          <span class="eyebrow">From the shop</span>
          <h2>Popular parts</h2>
        </div>
        <RouterLink to="/shop" class="btn btn-ghost">See everything</RouterLink>
      </div>

      <LoadingState v-if="loading" message="Loading parts..." />

      <div v-else-if="featured.length" class="grid featured-grid">
        <ProductCard v-for="product in featured" :key="product.id" :product="product" />
      </div>
    </section>

    <!-- The differentiator -->
    <section class="section container">
      <div class="section-head">
        <span class="eyebrow">What makes it different</span>
        <h2>PCPartPicker helps you build a PC.<br />MyRig helps you design a setup.</h2>
        <p>
          PCPartPicker is about parts, prices and compatibility. That is a solved problem.
          MyRig is about the thing you actually sit down at - chosen around what you play,
          what you can spend, and how you want it to look.
        </p>
      </div>

      <div class="grid grid-3">
        <article v-for="item in DIFFERENTIATORS" :key="item.title" class="card feature">
          <h3>{{ item.title }}</h3>
          <p class="muted">{{ item.body }}</p>
        </article>
      </div>
    </section>

    <!-- Closing CTA -->
    <section class="section container">
      <div class="cta">
        <h2>Ready to plan your rig?</h2>
        <p class="muted">
          Pick a few games, set a budget, choose a style. You will have a full setup in a minute.
        </p>
        <RouterLink to="/quiz" class="btn btn-lg">Start Setup Quiz</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------- Hero ---------- */
.hero {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: var(--space-7);
  padding-block: var(--space-8) var(--space-7);
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  background: linear-gradient(120deg, var(--text) 35%, var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lede {
  color: var(--muted);
  margin-top: var(--space-4);
  max-width: 54ch;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.hero-note {
  margin-top: var(--space-3);
  font-size: 0.875rem;
}

/* ---------- Hero art ---------- */
.hero-art {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 340px;
}

.art-glow {
  position: absolute;
  inset: 10% 5%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.35), transparent 65%);
  filter: blur(30px);
}

.art-monitor {
  width: 78%;
}

.art-screen {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--space-4);
  aspect-ratio: 16 / 10;
  background: linear-gradient(160deg, var(--surface-light), var(--surface));
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--glow-secondary);
}

.art-line {
  height: 8px;
  border-radius: 4px;
  background: rgba(249, 250, 251, 0.12);
}

.w60 {
  width: 60%;
}

.w90 {
  width: 90%;
}

.w40 {
  width: 40%;
}

.art-bar {
  margin-top: auto;
  height: 10px;
  border-radius: 999px;
  background: rgba(249, 250, 251, 0.08);
  overflow: hidden;
}

.art-bar span {
  display: block;
  width: 72%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
}

.art-stand {
  width: 18%;
  height: 26px;
  margin: 0 auto;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 4px 4px;
}

.art-desk {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-3);
  padding-top: var(--space-4);
  border-top: 2px solid var(--border-strong);
}

.art-tower {
  width: 34px;
  height: 62px;
  border-radius: 5px;
  background: linear-gradient(180deg, var(--primary), #4c1d95);
  box-shadow: 0 0 18px rgba(124, 58, 237, 0.5);
}

.art-keyboard {
  width: 130px;
  height: 16px;
  border-radius: 4px;
  background: var(--surface-light);
  border: 1px solid var(--border-strong);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.3);
}

.art-mouse {
  width: 16px;
  height: 24px;
  border-radius: 8px 8px 6px 6px;
  background: var(--surface-light);
  border: 1px solid var(--border-strong);
}

/* ---------- Paths ---------- */
.path {
  display: flex;
  flex-direction: column;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.12s ease;
}

.path:hover {
  transform: translateY(-2px);
  border-color: rgba(34, 211, 238, 0.4);
  text-decoration: none;
}

.path h3 {
  margin-bottom: var(--space-2);
}

.path p {
  flex: 1;
  font-size: 0.9375rem;
}

.path-cta {
  margin-top: var(--space-4);
  color: var(--secondary);
  font-size: 0.875rem;
  font-weight: 600;
}

/* ---------- Featured ---------- */
.featured-grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

/* ---------- Features ---------- */
.feature h3 {
  margin-bottom: var(--space-2);
}

.feature p {
  font-size: 0.9375rem;
}

/* ---------- CTA ---------- */
.cta {
  padding: var(--space-7);
  text-align: center;
  background: linear-gradient(140deg, rgba(124, 58, 237, 0.18), rgba(34, 211, 238, 0.08));
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: var(--radius-lg);
}

.cta p {
  margin: var(--space-3) auto var(--space-5);
  max-width: 48ch;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    padding-block: var(--space-6);
  }

  .hero-art {
    order: -1;
    min-height: 240px;
  }
}
</style>
