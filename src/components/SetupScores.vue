<script setup>
import { computed } from 'vue'
import ScoreCard from './ScoreCard.vue'

const props = defineProps({
  scores: { type: Array, required: true },
})

/** Headline number: the average of the five scores. */
const overall = computed(() =>
  Math.round(props.scores.reduce((sum, s) => sum + s.score, 0) / props.scores.length)
)
</script>

<template>
  <section class="scores">
    <div class="row-between head">
      <div>
        <span class="eyebrow">Setup scores</span>
        <h2>How good is this setup, honestly?</h2>
        <p class="muted">
          Five scores out of 100, each with the reason behind it. They are meant to point
          at the weak spot, not to flatter the build.
        </p>
      </div>
      <div class="overall">
        <span class="overall-number">{{ overall }}</span>
        <span class="overall-label muted">Overall</span>
      </div>
    </div>

    <div class="grid grid-2">
      <ScoreCard v-for="score in scores" :key="score.key" :score="score" />
    </div>
  </section>
</template>

<style scoped>
.head {
  margin-bottom: var(--space-5);
  align-items: flex-start;
}

.head p {
  margin-top: var(--space-2);
  max-width: 56ch;
}

.overall {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  background: var(--primary-soft);
  border: 1px solid rgba(124, 58, 237, 0.35);
  border-radius: var(--radius);
}

.overall-number {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  color: var(--text);
}

.overall-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 4px;
}
</style>
