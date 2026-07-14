<script setup>
/**
 * The split-screen auth layout from the Figma: a dark hero on the left carrying
 * the MYRIG wordmark and the tagline, the form on the right.
 *
 * The hero is CSS rather than a photograph - no stock imagery to license, and it
 * stays crisp at any size.
 */
import Logo from './Logo.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="auth">
    <!-- Left: the brand panel -->
    <aside class="hero" aria-hidden="true">
      <div class="hero-glow"></div>
      <div class="hero-grid"></div>

      <div class="hero-content">
        <Logo :wordmark="false" size="lg" class="hero-mark" />
        <p class="hero-word">MYRIG</p>
        <p class="hero-tagline">DESIGN THE RIG THAT FITS YOU</p>
      </div>

      <div class="hero-rig">
        <span class="rig-tower"></span>
        <span class="rig-screen"></span>
      </div>
    </aside>

    <!-- Right: the form -->
    <main class="panel">
      <div class="panel-inner">
        <RouterLink to="/" class="panel-logo">
          <Logo />
        </RouterLink>

        <h1 class="title">{{ title }}</h1>
        <p v-if="subtitle" class="subtitle muted">{{ subtitle }}</p>

        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 88px);
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(120% 100% at 20% 0%, #10203a, #05070d 70%);
  border-right: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin: var(--space-4);
}

.hero-glow {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(40% 40% at 30% 40%, rgba(34, 211, 238, 0.35), transparent 70%),
    radial-gradient(40% 40% at 70% 70%, rgba(124, 58, 237, 0.3), transparent 70%);
  filter: blur(40px);
}

/* Faint perspective grid, for the "gaming" feel without a stock photo. */
.hero-grid {
  position: absolute;
  inset: 40% -20% -20% -20%;
  background-image:
    linear-gradient(rgba(34, 211, 238, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34, 211, 238, 0.18) 1px, transparent 1px);
  background-size: 40px 40px;
  transform: perspective(300px) rotateX(60deg);
  mask-image: linear-gradient(transparent, #000);
}

.hero-content {
  position: relative;
  text-align: center;
  padding: var(--space-6);
}

.hero-mark {
  margin-bottom: var(--space-4);
}

.hero-word {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text);
  text-shadow: 0 0 30px rgba(34, 211, 238, 0.6);
}

.hero-tagline {
  margin-top: var(--space-3);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  color: var(--secondary);
}

/* A suggestion of a desk at the bottom of the panel. */
.hero-rig {
  position: absolute;
  bottom: 8%;
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  opacity: 0.5;
}

.rig-tower {
  width: 26px;
  height: 46px;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--primary), transparent);
}

.rig-screen {
  width: 110px;
  height: 62px;
  border-radius: 6px;
  border: 1px solid rgba(34, 211, 238, 0.5);
  background: rgba(34, 211, 238, 0.08);
}

/* ---------- Form panel ---------- */
.panel {
  display: grid;
  place-items: center;
  padding: var(--space-6);
}

.panel-inner {
  width: 100%;
  max-width: 380px;
}

.panel-logo {
  display: none;
  margin-bottom: var(--space-5);
}

.title {
  font-size: 1.875rem;
  margin-bottom: var(--space-2);
}

.subtitle {
  margin-bottom: var(--space-6);
}

@media (max-width: 900px) {
  .auth {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .hero {
    min-height: 220px;
    margin: var(--space-4) var(--space-4) 0;
  }

  .hero-rig {
    display: none;
  }

  .panel-logo {
    display: inline-flex;
  }
}
</style>
