<script setup>
// RAWG's terms require attribution wherever their data is shown. That is the
// line below - do not remove it.
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <strong>MyRig</strong>
        <p class="muted">Build your gaming setup around your games, budget, and style.</p>
      </div>

      <nav class="footer-links" aria-label="Footer">
        <RouterLink to="/quiz">Setup Quiz</RouterLink>
        <RouterLink to="/learn">Learning Center</RouterLink>
        <RouterLink to="/builds">Saved Builds</RouterLink>
      </nav>

      <div class="footer-meta">
        <p class="muted attribution">
          Game data provided by
          <a href="https://rawg.io" target="_blank" rel="noopener">RAWG</a>.
        </p>
        <p class="muted small">
          Prices are realistic samples for planning, not live retail prices.
        </p>
        <p class="muted small">&copy; {{ year }} MyRig - a student project.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--space-8);
  border-top: 1px solid var(--border);
  background: rgba(17, 24, 39, 0.6);
  padding-block: var(--space-6);
}

.footer-inner {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1.4fr;
  gap: var(--space-6);
  align-items: start;
}

.footer-brand strong {
  font-family: var(--font-display);
  font-size: 1.125rem;
}

.footer-brand p {
  margin-top: var(--space-2);
  font-size: 0.875rem;
  max-width: 34ch;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.footer-links a {
  color: var(--muted);
  font-size: 0.875rem;
}

.footer-links a:hover {
  color: var(--secondary);
}

.footer-meta {
  text-align: right;
}

.attribution {
  font-size: 0.875rem;
  color: var(--text);
}

.small {
  font-size: 0.8125rem;
  margin-top: var(--space-2);
}

@media (max-width: 800px) {
  .footer-inner {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .footer-meta {
    text-align: left;
  }
}
</style>
