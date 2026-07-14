<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import AuthLayout from '../components/AuthLayout.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''

  try {
    await auth.signIn({ email: email.value, password: password.value })
    // Back to wherever the guard bounced them from, or the account page.
    router.push(route.query.redirect || { name: 'account' })
  } catch (err) {
    // The server says "Email or password is incorrect" without saying which -
    // do not add detail here that the server deliberately withheld.
    error.value = err.message
  }
}
</script>

<template>
  <AuthLayout title="Welcome back" subtitle="Sign in to reach your builds, orders and wishlist.">
    <form class="form" @submit.prevent="submit">
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
          autocomplete="current-password"
          required
          placeholder="••••••••"
        />
      </label>

      <ErrorMessage v-if="error" :message="error" />

      <button type="submit" class="btn btn-lg full" :disabled="auth.loading">
        {{ auth.loading ? 'Signing in...' : 'Login' }}
      </button>

      <p class="switch muted">
        No account yet?
        <RouterLink :to="{ name: 'register', query: route.query }">Create one</RouterLink>
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

.field {
  display: block;
}

.label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  font-weight: 600;
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
