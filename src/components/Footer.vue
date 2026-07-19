<script setup>
/**
 * The three-column footer from the Figma: Get Started / Explore / Resources,
 * with the logo and a social row.
 *
 * The IGDB attribution is required by their terms wherever their data is shown.
 * Do not remove it.
 */
import Logo from './Logo.vue'

const year = new Date().getFullYear()

const columns = [
  {
    title: 'Get Started',
    links: [
      { to: '/quiz', label: 'Setup Quiz' },
      { to: '/custom', label: 'Custom Build' },
      { to: '/can-i-run-it', label: 'Can I Run It?' },
      { to: '/shop', label: 'Shop' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { to: '/shop?category=gpu', label: 'Graphics Cards' },
      { to: '/shop?category=cpu', label: 'Processors' },
      { to: '/shop?category=monitor', label: 'Monitors' },
      { to: '/shop?kind=accessory', label: 'Accessories' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/learn', label: 'Learning Center' },
      { to: '/builds', label: 'Saved Builds' },
      { to: '/orders', label: 'Orders' },
      { to: '/account', label: 'Account' },
    ],
  },
]
</script>

<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="brand-col">
        <Logo />
        <p class="tagline muted">Design the rig that fits you.</p>

        <ul class="social" aria-label="Social links">
          <li v-for="icon in ['X', 'IG', 'YT', 'TT', 'DC']" :key="icon">
            <span class="social-dot" aria-hidden="true">{{ icon }}</span>
          </li>
        </ul>
      </div>

      <nav v-for="column in columns" :key="column.title" class="col">
        <h3 class="col-title">{{ column.title }}</h3>
        <ul>
          <li v-for="link in column.links" :key="link.label">
            <RouterLink :to="link.to">{{ link.label }}</RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="container legal">
      <p class="muted">
        Game data provided by <a href="https://www.igdb.com" target="_blank" rel="noopener">IGDB</a>.
      </p>
      <p class="muted">
        Prices are realistic samples for planning. Checkout is simulated - no payment is taken.
      </p>
      <p class="muted">&copy; {{ year }} MyRig - a student project.</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--space-8);
  padding-block: var(--space-7) var(--space-5);
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.footer-inner {
  display: grid;
  grid-template-columns: 1.6fr repeat(3, 1fr);
  gap: var(--space-6);
}

.tagline {
  margin-top: var(--space-3);
  font-size: 0.9375rem;
  max-width: 30ch;
}

.social {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: 0;
  list-style: none;
}

.social-dot {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  color: var(--muted);
  font-size: 0.625rem;
  font-weight: 700;
}

.col-title {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
  margin-bottom: var(--space-4);
}

.col ul {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

.col a {
  color: var(--muted);
  font-size: 0.875rem;
}

.col a:hover {
  color: var(--secondary);
}

.legal {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: space-between;
  margin-top: var(--space-7);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border);
  font-size: 0.8125rem;
}

@media (max-width: 800px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }

  .brand-col {
    grid-column: 1 / -1;
  }
}
</style>
