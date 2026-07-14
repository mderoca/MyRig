<script setup>
defineProps({
  upgrade: { type: Object, required: true }, // { upgrade_name, priority, estimated_cost, reason }
})
</script>

<template>
  <article class="upgrade-card">
    <header class="head">
      <h3 class="name">{{ upgrade.upgrade_name }}</h3>
      <span class="priority" :class="upgrade.priority.toLowerCase()">
        {{ upgrade.priority }}
      </span>
    </header>

    <p class="cost">
      <span class="muted cost-label">Estimated cost</span>
      <span class="price">${{ upgrade.estimated_cost }}</span>
    </p>

    <p class="reason">{{ upgrade.reason }}</p>
  </article>
</template>

<style scoped>
.upgrade-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.name {
  font-size: 1rem;
}

.priority {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* High = orange (do this next), Medium = cyan, Low = grey. */
.priority.high {
  background: var(--warning-soft);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.priority.medium {
  background: var(--secondary-soft);
  color: var(--secondary);
  border: 1px solid rgba(34, 211, 238, 0.3);
}

.priority.low {
  background: var(--surface-light);
  color: var(--muted);
  border: 1px solid var(--border);
}

.cost {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.cost-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.reason {
  flex: 1;
  color: var(--muted);
  font-size: 0.9375rem;
}
</style>
