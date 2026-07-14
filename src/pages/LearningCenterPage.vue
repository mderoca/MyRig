<script setup>
/**
 * The Learning Center. Reads the learning_cards table via /api/learning.
 *
 * The same rows power beginner mode on the recommendation page - one place to
 * edit an explanation, two places it shows up.
 */

import { ref, onMounted } from 'vue'
import { getLearningCards } from '../services/api.js'
import LearningCard from '../components/LearningCard.vue'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const cards = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''

  try {
    cards.value = await getLearningCards()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="learn section container">
    <div class="section-head">
      <span class="eyebrow">Learning center</span>
      <h1>PC building, in plain language</h1>
      <p>
        Every term explained twice: once quickly, and once as if nobody had ever told you.
        No jargon, no assumed knowledge. Tick "I am new to PC building" in the quiz and
        these explanations appear next to your recommended parts too.
      </p>
    </div>

    <LoadingState v-if="loading" message="Loading the learning cards..." />

    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />

    <div v-else class="grid grid-3">
      <LearningCard v-for="card in cards" :key="card.id" :card="card" />
    </div>

    <div v-if="!loading && !error" class="card cta">
      <div>
        <h2>Ready to put it into practice?</h2>
        <p class="muted">
          The quiz asks four questions and explains every part it picks for you.
        </p>
      </div>
      <RouterLink to="/quiz" class="btn btn-lg">Start Setup Quiz</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  margin-top: var(--space-7);
  background: linear-gradient(140deg, rgba(124, 58, 237, 0.16), rgba(34, 211, 238, 0.06));
  border-color: rgba(124, 58, 237, 0.3);
}

.cta p {
  margin-top: var(--space-2);
}

.cta .btn {
  flex: none;
}

@media (max-width: 700px) {
  .cta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
