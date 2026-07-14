<script setup>
defineProps({
  summary: { type: Object, required: true }, // { style, label, vibe, body, matchedItems[] }
})
</script>

<template>
  <!-- data-style swaps the accent variables (see theme.css), so this card takes
       on the colour vibe of the style the user picked. -->
  <section class="card style-summary" :data-style="summary.style">
    <span class="eyebrow">Setup style</span>
    <h2 class="title">{{ summary.label }}</h2>
    <p class="vibe">{{ summary.vibe }}</p>
    <p class="body">{{ summary.body }}</p>

    <div v-if="summary.matchedItems.length" class="matched">
      <h3 class="matched-title">Chosen for this style</h3>
      <ul class="matched-list">
        <li v-for="item in summary.matchedItems" :key="item.name" class="matched-item">
          <span class="dot" aria-hidden="true"></span>
          <div>
            <strong>{{ item.name }}</strong>
            <p class="muted">{{ item.reason }}</p>
          </div>
        </li>
      </ul>
    </div>

    <p v-else class="muted">
      Nothing in this build was picked specifically for the style yet - the budget went
      into performance instead. Swapping the case and peripherals would fix that.
    </p>
  </section>
</template>

<style scoped>
.style-summary {
  position: relative;
  overflow: hidden;
}

/* The accent bar is the only thing that changes per style - subtle, not gaudy. */
.style-summary::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--accent-a, var(--primary)),
    var(--accent-b, var(--secondary)),
    var(--accent-c, var(--primary))
  );
}

.title {
  margin-bottom: var(--space-2);
}

.vibe {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  color: var(--accent-b, var(--secondary));
  margin-bottom: var(--space-3);
}

.body {
  color: var(--muted);
  max-width: 62ch;
}

.matched {
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border);
}

.matched-title {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: var(--space-4);
}

.matched-list {
  display: grid;
  gap: var(--space-4);
  padding: 0;
  list-style: none;
}

.matched-item {
  display: flex;
  gap: var(--space-3);
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 50%;
  background: var(--accent-a, var(--primary));
  box-shadow: 0 0 8px var(--accent-a, var(--primary));
}

.matched-item p {
  font-size: 0.9375rem;
  margin-top: 2px;
}
</style>
