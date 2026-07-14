<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import AuthLayout from '../components/AuthLayout.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const displayName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

// Mirrors the server's rule (api/_lib/auth.js). The server is the one that
// actually enforces it - this just saves a round trip and tells the user early.
const tooShort = computed(() => password.value.length > 0 && password.value.length < 8)

async function submit() {
  error.value = ''

  try {
    await auth.signUp({
      displayName: displayName.value,
      email: email.value,
      password: password.value,
    })
    router.push(route.query.redirect || { name: 'account' })
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <AuthLayout
    title="Create your account"
    subtitle="Save builds, keep a wishlist, and track your orders."
  >
    <form class="form" @submit.prevent="submit">
      <label class="field">
        <span class="label">Name</span>
        <input
          v-model="displayName"
          class="input"
          type="text"
          autocomplete="name"
          required
          maxlength="80"
          placeholder="Alex"
        />
      </label>

      <label class="field">
        <span class="label">Email</span>
        <input
          v-model="email"
          class="input"
          type="email"
          autocomplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label class="field">
        <span class="label">Password</span>
        <input
          v-model="password"
          class="input"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
          placeholder="At least 8 characters"
        />
        <span v-if="tooShort" class="hint">Needs at least 8 characters.</span>
      </label>

      <ErrorMessage v-if="error" :message="error" />

      <button type="submit" class="btn btn-lg full" :disabled="auth.loading">
        {{ auth.loading ? 'Creating account...' : 'Register' }}
      </button>

      <p class="switch muted">
        Already have an account?
        <RouterLink :to="{ name: 'login', query: route.query }">Sign in</RouterLink>
      </p>
    </form>
  </AuthLayout>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  font-weight: 600;
}

.hint {
  display: block;
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  color: var(--warning);
}

.full {
  width: 100%;
  margin-top: var(--space-2);
}

.switch {
  text-align: center;
  font-size: 0.875rem;
  margin-top: var(--space-2);
}
</style>
