<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Object, required: true }, // { key, label, score, explanation }
})

/** Green for a good score, cyan for fine, orange for weak. Matches the budget colours. */
const band = computed(() => {
  if (props.score.score >= 80) return 'good'
  if (props.score.score >= 60) return 'ok'
  return 'weak'
})

/** Stroke offset for the ring. Circumference of an r=26 circle is ~163.4. */
const CIRCUMFERENCE = 2 * Math.PI * 26
const dashOffset = computed(() => CIRCUMFERENCE * (1 - props.score.score / 100))
</script>

<template>
  <article class="score-card">
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 60 60" role="img" :aria-label="`${score.label}: ${score.score} out of 100`">
        <circle class="ring-track" cx="30" cy="30" r="26" />
        <circle
          class="ring-value"
          :class="band"
          cx="30"
          cy="30"
          r="26"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <span class="ring-number" :class="band">{{ score.score }}</span>
    </div>

    <div class="body">
      <h3 class="label">{{ score.label }}</h3>
      <p class="out-of muted">{{ score.score }}/100</p>
      <p class="explanation">{{ score.explanation }}</p>
    </div>
  </article>
</template>

<style scoped>
.score-card {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  height: 100%;
}

.ring-wrap {
  position: relative;
  flex: none;
  width: 60px;
  height: 60px;
}

.ring {
  width: 60px;
  height: 60px;
  transform: rotate(-90deg);
}

.ring-track,
.ring-value {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
}

.ring-track {
  stroke: var(--surface-light);
}

.ring-value {
  transition: stroke-dashoffset 0.7s ease;
}

.ring-value.good {
  stroke: var(--success);
}

.ring-value.ok {
  stroke: var(--secondary);
}

.ring-value.weak {
  stroke: var(--warning);
}

.ring-number {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
}

.ring-number.good {
  color: var(--success);
}

.ring-number.ok {
  color: var(--secondary);
}

.ring-number.weak {
  color: var(--warning);
}

.label {
  font-size: 1rem;
}

.out-of {
  font-size: 0.8125rem;
  margin-bottom: var(--space-2);
}

.explanation {
  font-size: 0.9375rem;
  color: var(--muted);
}
</style>
