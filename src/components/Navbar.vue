<script setup>
/**
 * The floating pill navbar from the Figma: logo left, links centre, account and
 * cart right.
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import { useCartStore } from '../stores/cartStore.js'
import Logo from './Logo.vue'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

const open = ref(false)
const menuOpen = ref(false)

router.afterEach(() => {
  open.value = false
  menuOpen.value = false
})

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/can-i-run-it', label: 'Can I Run It?' },
  { to: '/custom', label: 'Custom' },
  { to: '/learn', label: 'Learn' },
]

const initials = computed(() => {
  const name = auth.user?.displayName || ''
  return name.trim().slice(0, 1).toUpperCase() || '?'
})

async function signOut() {
  await auth.signOut()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="navbar">
    <div class="container">
      <div class="pill">
        <RouterLink to="/" class="brand" aria-label="MyRig home">
          <Logo />
        </RouterLink>

        <button
          class="menu-toggle"
          :aria-expanded="open"
          aria-label="Toggle navigation"
          @click="open = !open"
        >
          <span></span><span></span><span></span>
        </button>

        <nav class="links" :class="{ open }">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="link">
            {{ link.label }}
          </RouterLink>
        </nav>

        <div class="actions" :class="{ open }">
          <RouterLink to="/cart" class="cart" aria-label="Cart">
            <span class="cart-icon" aria-hidden="true">🛒</span>
            <span v-if="cart.count" class="badge">{{ cart.count }}</span>
            <span class="cart-label">Cart</span>
          </RouterLink>

          <!-- Signed out: the Login / Register pair from the Figma. -->
          <template v-if="!auth.isSignedIn">
            <RouterLink to="/login" class="btn btn-ghost btn-sm">Login</RouterLink>
            <RouterLink to="/register" class="btn btn-sm">Register</RouterLink>
          </template>

          <!-- Signed in: an avatar that opens the account menu. -->
          <div v-else class="account">
            <button
              class="avatar"
              :aria-expanded="menuOpen"
              aria-label="Account menu"
              @click="menuOpen = !menuOpen"
            >
              {{ initials }}
            </button>

            <div v-if="menuOpen" class="menu">
              <p class="menu-head">
                <strong>{{ auth.user.displayName }}</strong>
                <span class="muted">{{ auth.user.email }}</span>
              </p>
              <RouterLink to="/account" class="menu-item">Account settings</RouterLink>
              <RouterLink to="/orders" class="menu-item">Orders</RouterLink>
              <RouterLink to="/builds" class="menu-item">Saved builds</RouterLink>
              <RouterLink to="/wishlist" class="menu-item">Wishlist</RouterLink>
              <button class="menu-item danger" @click="signOut">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-block: var(--space-3);
  background: linear-gradient(180deg, var(--bg) 65%, transparent);
}

/* The rounded floating bar from the Figma. */
.pill {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 10px 10px 10px 18px;
  background: rgba(17, 24, 39, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow-lg);
}

.brand:hover {
  text-decoration: none;
}

.links {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-inline: auto;
}

.link {
  color: var(--muted);
  font-size: 0.9375rem;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.link:hover {
  color: var(--text);
  text-decoration: none;
}

.link.router-link-active {
  color: var(--secondary);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.875rem;
  border-radius: 999px;
}

.cart {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.cart:hover {
  color: var(--text);
  background: var(--surface-light);
  text-decoration: none;
}

.cart-icon {
  font-size: 1rem;
  line-height: 1;
}

.cart-label {
  display: none;
}

.badge {
  position: absolute;
  top: 2px;
  left: 20px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding-inline: 4px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
}

/* ---- Account menu ---- */
.account {
  position: relative;
}

.avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: linear-gradient(140deg, var(--primary), var(--secondary));
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  cursor: pointer;
}

.menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 220px;
  padding: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}

.menu-head {
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
}

.menu-head .muted {
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--surface-light);
  text-decoration: none;
}

.menu-item.danger {
  color: var(--danger);
  margin-top: var(--space-2);
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

/* ---- Mobile ---- */
.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 9px;
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  cursor: pointer;
}

.menu-toggle span {
  display: block;
  width: 16px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
}

@media (max-width: 900px) {
  .pill {
    flex-wrap: wrap;
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
  }

  .menu-toggle {
    display: flex;
  }

  .links,
  .actions {
    display: none;
    width: 100%;
  }

  .links.open {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    margin: var(--space-4) 0 0;
    padding-top: var(--space-4);
    border-top: 1px solid var(--border);
  }

  .actions.open {
    display: flex;
    flex-wrap: wrap;
    margin-top: var(--space-4);
  }

  .cart-label {
    display: inline;
  }
}
</style>
