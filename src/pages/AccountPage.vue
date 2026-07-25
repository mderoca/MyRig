<script setup>
/**
 * Account settings - the Figma's Account page: a sidebar of account links, and
 * the user's details.
 *
 * Name, email and password are editable. Each field's editor is inline: click
 * "Edit" to swap the display for a form. Email change requires the current
 * password (session-theft mitigation); name change does not; password change
 * is its own form with a "Change password" toggle.
 */

import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import { listOrders, listBuilds, listWishlist } from '../services/api.js'

const auth = useAuthStore()
const router = useRouter()

const counts = ref({ orders: null, builds: null, wishlist: null })

const memberSince = computed(() =>
  auth.user?.createdAt
    ? new Date(auth.user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : ''
)

const LINKS = [
  { to: '/orders', label: 'Orders', key: 'orders', blurb: 'Everything you have ordered' },
  { to: '/builds', label: 'Saved builds', key: 'builds', blurb: 'Setups from the quiz' },
  { to: '/wishlist', label: 'Wishlist', key: 'wishlist', blurb: 'Parts saved for later' },
]

// ---------- Editing state ----------
// One reactive form per editable field. `open` toggles the inline editor.
// `busy` disables the submit while the network request is in flight. `error`
// shows the last server-side rejection so retries surface a real message.
const nameForm = reactive({ open: false, value: '', busy: false, error: '', ok: '' })
const emailForm = reactive({ open: false, value: '', currentPassword: '', busy: false, error: '', ok: '' })
const passwordForm = reactive({ open: false, current: '', next: '', confirm: '', busy: false, error: '', ok: '' })

function openNameForm() {
  nameForm.value = auth.user.displayName
  nameForm.error = ''
  nameForm.ok = ''
  nameForm.open = true
}
function openEmailForm() {
  emailForm.value = auth.user.email
  emailForm.currentPassword = ''
  emailForm.error = ''
  emailForm.ok = ''
  emailForm.open = true
}
function openPasswordForm() {
  passwordForm.current = ''
  passwordForm.next = ''
  passwordForm.confirm = ''
  passwordForm.error = ''
  passwordForm.ok = ''
  passwordForm.open = true
}

async function submitName() {
  nameForm.busy = true
  nameForm.error = ''
  try {
    await auth.updateProfile({ displayName: nameForm.value })
    nameForm.ok = 'Name updated.'
    nameForm.open = false
  } catch (err) {
    nameForm.error = err.message || 'Could not update.'
  } finally {
    nameForm.busy = false
  }
}

async function submitEmail() {
  emailForm.busy = true
  emailForm.error = ''
  try {
    await auth.updateProfile({
      email: emailForm.value,
      currentPassword: emailForm.currentPassword,
    })
    emailForm.ok = 'Email updated.'
    emailForm.open = false
  } catch (err) {
    emailForm.error = err.message || 'Could not update.'
  } finally {
    emailForm.busy = false
  }
}

async function submitPassword() {
  passwordForm.busy = true
  passwordForm.error = ''
  if (passwordForm.next !== passwordForm.confirm) {
    passwordForm.error = 'New password and confirmation do not match.'
    passwordForm.busy = false
    return
  }
  try {
    await auth.changePassword({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.next,
    })
    passwordForm.ok = 'Password changed.'
    passwordForm.open = false
  } catch (err) {
    passwordForm.error = err.message || 'Could not change password.'
  } finally {
    passwordForm.busy = false
  }
}

async function signOut() {
  await auth.signOut()
  router.push({ name: 'home' })
}

onMounted(async () => {
  const [orders, builds, wishlist] = await Promise.allSettled([
    listOrders(),
    listBuilds(),
    listWishlist(),
  ])

  counts.value = {
    orders: orders.status === 'fulfilled' ? orders.value.length : null,
    builds: builds.status === 'fulfilled' ? builds.value.length : null,
    wishlist: wishlist.status === 'fulfilled' ? wishlist.value.length : null,
  }
})
</script>

<template>
  <div v-if="auth.user" class="account section container">
    <div class="section-head">
      <span class="eyebrow">Account</span>
      <h1>Account settings</h1>
    </div>

    <div class="layout">
      <!-- Sidebar -->
      <aside class="sidebar card">
        <div class="who">
          <span class="avatar" aria-hidden="true">
            {{ auth.user.displayName.slice(0, 1).toUpperCase() }}
          </span>
          <div>
            <strong>{{ auth.user.displayName }}</strong>
            <p class="muted small">{{ auth.user.email }}</p>
          </div>
        </div>

        <nav class="links">
          <RouterLink v-for="link in LINKS" :key="link.to" :to="link.to" class="link">
            <span>
              <strong>{{ link.label }}</strong>
              <span class="muted small block">{{ link.blurb }}</span>
            </span>
            <span v-if="counts[link.key] !== null" class="count">{{ counts[link.key] }}</span>
          </RouterLink>
        </nav>

        <button class="btn btn-danger full" @click="signOut">Sign out</button>
      </aside>

      <!-- Details -->
      <section class="details card">
        <h2>Your details</h2>
        <p class="muted intro">
          MyRig stores your name and email, and nothing else. There is no address, no phone
          number and no payment information - checkout is simulated, so none of it is needed.
        </p>

        <dl class="fields">
          <!-- Name -->
          <div class="field">
            <dt>Name</dt>
            <dd>
              <template v-if="!nameForm.open">
                <div class="row">
                  <span>{{ auth.user.displayName }}</span>
                  <button type="button" class="link-btn" @click="openNameForm">Edit</button>
                </div>
                <p v-if="nameForm.ok" class="ok small">{{ nameForm.ok }}</p>
              </template>
              <form v-else class="edit-form" @submit.prevent="submitName">
                <label class="sr-only" for="acct-name">Name</label>
                <input
                  id="acct-name"
                  v-model="nameForm.value"
                  type="text"
                  maxlength="80"
                  required
                  autocomplete="name"
                />
                <div class="edit-actions">
                  <button type="submit" class="btn btn-sm" :disabled="nameForm.busy">
                    {{ nameForm.busy ? 'Saving…' : 'Save' }}
                  </button>
                  <button type="button" class="btn btn-sm btn-ghost" :disabled="nameForm.busy" @click="nameForm.open = false">
                    Cancel
                  </button>
                </div>
                <p v-if="nameForm.error" class="err small" role="alert">{{ nameForm.error }}</p>
              </form>
            </dd>
          </div>

          <!-- Email -->
          <div class="field">
            <dt>Email</dt>
            <dd>
              <template v-if="!emailForm.open">
                <div class="row">
                  <span>{{ auth.user.email }}</span>
                  <button type="button" class="link-btn" @click="openEmailForm">Change email</button>
                </div>
                <p v-if="emailForm.ok" class="ok small">{{ emailForm.ok }}</p>
              </template>
              <form v-else class="edit-form" @submit.prevent="submitEmail">
                <label class="sr-only" for="acct-email">New email</label>
                <input
                  id="acct-email"
                  v-model="emailForm.value"
                  type="email"
                  maxlength="200"
                  required
                  autocomplete="email"
                  placeholder="New email"
                />
                <label class="sr-only" for="acct-email-pw">Current password</label>
                <input
                  id="acct-email-pw"
                  v-model="emailForm.currentPassword"
                  type="password"
                  minlength="8"
                  required
                  autocomplete="current-password"
                  placeholder="Current password (to confirm)"
                />
                <div class="edit-actions">
                  <button type="submit" class="btn btn-sm" :disabled="emailForm.busy">
                    {{ emailForm.busy ? 'Saving…' : 'Save' }}
                  </button>
                  <button type="button" class="btn btn-sm btn-ghost" :disabled="emailForm.busy" @click="emailForm.open = false">
                    Cancel
                  </button>
                </div>
                <p v-if="emailForm.error" class="err small" role="alert">{{ emailForm.error }}</p>
              </form>
            </dd>
          </div>

          <!-- Password -->
          <div class="field">
            <dt>Password</dt>
            <dd>
              <template v-if="!passwordForm.open">
                <div class="row">
                  <span class="muted">Stored as a bcrypt hash. Even we cannot read it.</span>
                  <button type="button" class="link-btn" @click="openPasswordForm">Change password</button>
                </div>
                <p v-if="passwordForm.ok" class="ok small">{{ passwordForm.ok }}</p>
              </template>
              <form v-else class="edit-form" @submit.prevent="submitPassword">
                <label class="sr-only" for="acct-pw-current">Current password</label>
                <input
                  id="acct-pw-current"
                  v-model="passwordForm.current"
                  type="password"
                  minlength="8"
                  required
                  autocomplete="current-password"
                  placeholder="Current password"
                />
                <label class="sr-only" for="acct-pw-next">New password</label>
                <input
                  id="acct-pw-next"
                  v-model="passwordForm.next"
                  type="password"
                  minlength="8"
                  required
                  autocomplete="new-password"
                  placeholder="New password (min 8 characters)"
                />
                <label class="sr-only" for="acct-pw-confirm">Confirm new password</label>
                <input
                  id="acct-pw-confirm"
                  v-model="passwordForm.confirm"
                  type="password"
                  minlength="8"
                  required
                  autocomplete="new-password"
                  placeholder="Confirm new password"
                />
                <div class="edit-actions">
                  <button type="submit" class="btn btn-sm" :disabled="passwordForm.busy">
                    {{ passwordForm.busy ? 'Saving…' : 'Save' }}
                  </button>
                  <button type="button" class="btn btn-sm btn-ghost" :disabled="passwordForm.busy" @click="passwordForm.open = false">
                    Cancel
                  </button>
                </div>
                <p v-if="passwordForm.error" class="err small" role="alert">{{ passwordForm.error }}</p>
              </form>
            </dd>
          </div>

          <div class="field">
            <dt>Member since</dt>
            <dd>{{ memberSince }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>

<style scoped>
.small {
  font-size: 0.8125rem;
}

.block {
  display: block;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--space-5);
  align-items: start;
}

/* ---------- Sidebar ---------- */
.who {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.avatar {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(140deg, var(--primary), var(--secondary));
  color: #fff;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
}

.links {
  display: grid;
  gap: 4px;
  margin-bottom: var(--space-4);
}

.link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.9375rem;
}

.link:hover {
  background: var(--surface-light);
  text-decoration: none;
}

.link.router-link-active {
  background: var(--secondary-soft);
  color: var(--secondary);
}

.count {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding-inline: 6px;
  border-radius: 999px;
  background: var(--surface-light);
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.full {
  width: 100%;
}

/* ---------- Details ---------- */
.intro {
  margin: var(--space-3) 0 var(--space-5);
  max-width: 62ch;
}

.fields {
  margin: 0;
}

.field {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-4);
  padding-block: var(--space-4);
  border-top: 1px solid var(--border);
}

.field dt {
  color: var(--muted);
  font-size: 0.875rem;
}

.field dd {
  margin: 0;
}

/* Row shows current value + an inline edit button. */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.link-btn {
  padding: 0;
  background: none;
  border: none;
  color: var(--secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

/* Inline edit form when a field is being edited. */
.edit-form {
  display: grid;
  gap: var(--space-2);
  max-width: 420px;
}

.edit-form input {
  width: 100%;
  padding: 9px 12px;
  background: var(--surface-light);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.9375rem;
}

.edit-form input:focus {
  outline: none;
  border-color: var(--secondary);
}

.edit-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: 2px;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 0.8125rem;
}

.err {
  margin: 0;
  color: var(--danger);
}

.ok {
  margin: 6px 0 0;
  color: var(--secondary);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .field {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
}
</style>
