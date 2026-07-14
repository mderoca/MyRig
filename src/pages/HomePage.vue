<script setup>
/**
 * The landing page. Its job is to answer, in one screen, the question the
 * course project has to answer too: why is this not just PCPartPicker?
 */

const DIFFERENTIATORS = [
  {
    title: 'Game-first recommendations',
    body: 'Start from the games you actually play. MyRig reads their genres and tags from RAWG and builds around them - a Valorant player and an Elden Ring player get different setups at the same budget.',
  },
  {
    title: 'Full setup budget',
    body: 'Your budget covers the whole desk, not just the tower. Monitor, keyboard, mouse, headset and accessories are all planned inside the number you picked.',
  },
  {
    title: 'Setup style picker',
    body: 'RGB, minimalist, white, cozy, streamer or esports. The style changes the case, the peripherals and the lighting - not just a colour swatch.',
  },
  {
    title: 'Beginner learning area',
    body: 'Never built a PC? Turn on beginner mode and every recommendation comes with a plain-language explanation of what the part actually does.',
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

const STEPS = [
  { n: '01', title: 'Pick your games', body: 'Search real games through the RAWG database.' },
  { n: '02', title: 'Answer three questions', body: 'Budget, gaming goal, setup style.' },
  { n: '03', title: 'Get your full setup', body: 'Parts, budget, scores and an upgrade path.' },
]
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero container">
      <div class="hero-copy">
        <span class="eyebrow">Gaming setup planner</span>
        <h1 class="hero-title">MyRig</h1>
        <p class="tagline">Build your gaming setup around your games, budget, and style.</p>

        <p class="lede">
          Most build tools start with parts. MyRig starts with you - the games in your
          library, the money you actually have, and the desk you want to sit at. Answer a
          short quiz and get a complete setup: the PC, the screen, the peripherals, the
          accessories, what it all costs, how good it is, and what to upgrade first.
        </p>

        <div class="hero-actions">
          <RouterLink to="/quiz" class="btn btn-lg">Start Setup Quiz</RouterLink>
          <RouterLink to="/learn" class="btn btn-ghost btn-lg">
            New to this? Start here
          </RouterLink>
        </div>

        <p class="muted hero-note">No account needed. Takes about a minute.</p>
      </div>

      <!-- A stylised "setup" rather than a stock photo. Pure CSS, so it costs nothing. -->
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

    <!-- What it is -->
    <section class="section container">
      <div class="steps">
        <div v-for="step in STEPS" :key="step.n" class="step">
          <span class="step-n">{{ step.n }}</span>
          <h3>{{ step.title }}</h3>
          <p class="muted">{{ step.body }}</p>
        </div>
      </div>
    </section>

    <!-- The differentiator section -->
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
  font-size: clamp(3rem, 7vw, 4.5rem);
  background: linear-gradient(120deg, var(--text) 30%, var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.tagline {
  font-family: var(--font-display);
  font-size: clamp(1.125rem, 2.2vw, 1.5rem);
  color: var(--text);
  margin-top: var(--space-3);
}

.lede {
  color: var(--muted);
  margin-top: var(--space-4);
  max-width: 56ch;
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

/* ---------- Steps ---------- */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-5);
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.step-n {
  display: block;
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--secondary);
  margin-bottom: var(--space-2);
}

.step h3 {
  margin-bottom: 4px;
}

.step p {
  font-size: 0.9375rem;
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
