<script setup>
/**
 * Saved Builds. Reads and deletes rows in the Neon `saved_builds` table for
 * this browser's demo user id.
 */

import { ref, onMounted } from 'vue'
import { listBuilds, deleteBuild } from '../services/api.js'
import { getUserId } from '../services/user.js'
import BuildSummary from '../components/BuildSummary.vue'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const builds = ref([])
const loading = ref(true)
const error = ref('')
const userId = ref('')

async function load() {
  loading.value = true
  error.value = ''

  try {
    userId.value = getUserId()
    builds.value = await listBuilds(userId.value)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function remove(build) {
  if (!confirm(`Delete "${build.build_name}"? This cannot be undone.`)) return

  const previous = builds.value
  // Drop it from the list straight away, and put it back if the server says no.
  builds.value = builds.value.filter((b) => b.id !== build.id)

  try {
    await deleteBuild(build.id, userId.value)
  } catch (err) {
    builds.value = previous
    error.value = err.message
  }
}

onMounted(load)
</script>

<template>
  <div class="builds section container">
    <div class="section-head">
      <span class="eyebrow">Saved builds</span>
      <h1>Your builds</h1>
      <p>
        Saved in the database against this browser. There is no login - MyRig generates a
        demo user id the first time you visit and keeps it in localStorage.
      </p>
      <p v-if="userId" class="user-id muted">
        Demo user: <code>{{ userId }}</code>
      </p>
    </div>

    <LoadingState v-if="loading" message="Loading your builds..." />

    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />

    <div v-else-if="!builds.length" class="card empty">
      <h2>Nothing saved yet</h2>
      <p class="muted">
        Run the quiz, generate a setup, and hit Save Build. It will show up here.
      </p>
      <RouterLink to="/quiz" class="btn btn-lg">Start Setup Quiz</RouterLink>
    </div>

    <div v-else class="grid grid-2">
      <BuildSummary
        v-for="build in builds"
        :key="build.id"
        :build="build"
        @delete="remove"
      />
    </div>
  </div>
</template>

<style scoped>
.user-id {
  margin-top: var(--space-3);
  font-size: 0.8125rem;
}

code {
  padding: 2px 6px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.8125rem;
  color: var(--secondary);
}

.empty {
  text-align: center;
  padding: var(--space-7);
}

.empty p {
  margin: var(--space-3) auto var(--space-5);
  max-width: 44ch;
}
</style>
