/**
 * Who is signed in.
 *
 * The session itself lives in an httpOnly cookie the browser sends automatically -
 * this store only holds the *display* copy of the user. Nothing here is a
 * credential, and signing out is done by the server clearing the cookie, not by
 * this store forgetting the user.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../services/api.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  /** False until the first /api/auth/me completes, so guards do not fire too early. */
  const ready = ref(false)

  const isSignedIn = computed(() => Boolean(user.value))

  /** Called once when the app boots, to restore an existing session. */
  async function restore() {
    if (ready.value) return user.value

    try {
      user.value = await api.me()
    } catch {
      user.value = null // not signed in, or the server is unreachable
    } finally {
      ready.value = true
    }

    return user.value
  }

  async function signIn(credentials) {
    loading.value = true
    try {
      user.value = await api.login(credentials)
      return user.value
    } finally {
      loading.value = false
    }
  }

  async function signUp(credentials) {
    loading.value = true
    try {
      user.value = await api.register(credentials)
      return user.value
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      await api.logout()
    } finally {
      // Clear locally even if the request failed - the cookie may already be gone.
      user.value = null
    }
  }

  return { user, loading, ready, isSignedIn, restore, signIn, signUp, signOut }
})
