<script setup>
/**
 * The MyRig mark: an "MR" monogram plus the wordmark, taken from the Figma.
 * `wordmark` off gives just the monogram (used in tight spaces).
 */
defineProps({
  wordmark: { type: Boolean, default: true },
  size: { type: String, default: 'md' }, // md | lg
})
</script>

<template>
  <span class="logo" :class="size">
    <svg class="mark" viewBox="0 0 40 32" role="img" aria-label="MyRig">
      <defs>
        <linearGradient id="myrig-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--secondary)" />
          <stop offset="100%" stop-color="var(--primary)" />
        </linearGradient>
      </defs>
      <!-- M -->
      <path
        d="M2 30V4l8 12 8-12v26"
        fill="none"
        stroke="url(#myrig-mark)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- R -->
      <path
        d="M24 30V4h7a6 6 0 010 12h-7l10 14"
        fill="none"
        stroke="url(#myrig-mark)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span v-if="wordmark" class="wordmark">MYRIG</span>
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
}

.mark {
  width: 30px;
  height: 24px;
  flex: none;
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.4));
}

.wordmark {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.lg .mark {
  width: 52px;
  height: 42px;
}

.lg .wordmark {
  font-size: 2.25rem;
  letter-spacing: 0.1em;
}
</style>
