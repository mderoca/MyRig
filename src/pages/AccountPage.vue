<script setup>
/**
 * Account settings - the Figma's Account page: a sidebar of account links, and
 * the user's details.
 *
 * The fields are read-only. There is no "edit profile" route on the server, and
 * a form that pretends to save and then does not is worse than no form. If
 * editing is wanted later, it needs a PATCH /api/auth/me with the same
 * validation as register.
 */

import { computed, ref, onMounted } from 'vue'
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

async function signOut() {
  await auth.signOut()
  router.push({ name: 'home' })
}

onMounted(async () => {
  // Counts are decoration - if one fails, the page is still perfectly usable.
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
          <div class="field">
            <dt>Name</dt>
            <dd>{{ auth.user.displayName }}</dd>
          </div>
          <div class="field">
            <dt>Email</dt>
            <dd>{{ auth.user.email }}</dd>
          </div>
          <div class="field">
            <dt>Password</dt>
            <dd class="muted">Stored as a bcrypt hash. Even we cannot read it.</dd>
          </div>
          <div class="field">
            <dt>Member since</dt>
            <dd>{{ memberSince }}</dd>
          </div>
        </dl>

        <p class="muted small footnote">
          Editing your details is not built yet - see the README's "Open questions".
        </p>
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

.footnote {
  margin-top: var(--space-5);
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
