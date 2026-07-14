<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const open = ref(false)
const router = useRouter()

// Close the mobile menu whenever we land on a new page.
router.afterEach(() => {
  open.value = false
})

const links = [
  { to: '/quiz', label: 'Setup Quiz' },
  { to: '/learn', label: 'Learning Center' },
  { to: '/builds', label: 'Saved Builds' },
]
</script>

<template>
  <header class="navbar">
    <div class="container navbar-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">MyRig</span>
      </RouterLink>

      <button
        class="menu-toggle"
        :aria-expanded="open"
        aria-label="Toggle navigation"
        @click="open = !open"
      >
        <span></span><span></span><span></span>
      </button>

      <nav class="nav-links" :class="{ open }">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="nav-link">
          {{ link.label }}
        </RouterLink>
        <RouterLink to="/quiz" class="btn nav-cta">Start Setup Quiz</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(11, 15, 25, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: 68px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand:hover {
  text-decoration: none;
}

.brand-mark {
  width: 12px;
  height: 22px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--primary), var(--secondary));
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.6);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.nav-link {
  color: var(--muted);
  font-weight: 500;
  font-size: 0.9375rem;
  padding-block: 4px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.nav-link:hover {
  color: var(--text);
  text-decoration: none;
}

/* vue-router adds this class to the link matching the current page. */
.nav-link.router-link-active {
  color: var(--secondary);
  border-bottom-color: var(--secondary);
}

.nav-cta {
  padding: 9px 18px;
  font-size: 0.9375rem;
}

.nav-cta.router-link-active {
  border-bottom: none;
}

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.menu-toggle span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
}

@media (max-width: 800px) {
  .menu-toggle {
    display: flex;
  }

  .nav-links {
    display: none;
    position: absolute;
    top: 68px;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
    padding: var(--space-5);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
  }

  .nav-links.open {
    display: flex;
  }

  .nav-link {
    border-bottom: none;
    padding: 8px 0;
  }
}
</style>
