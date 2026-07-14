<script setup>
defineProps({
  item: { type: Object, required: true },
})

/** Category slug -> the label shown on the card. */
const LABELS = {
  cpu: 'CPU',
  gpu: 'GPU',
  ram: 'RAM',
  storage: 'Storage',
  case: 'Case',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  headset: 'Headset',
  microphone: 'Microphone',
  webcam: 'Webcam',
  lighting: 'Lighting',
  desk: 'Desk',
}

const label = (category) => LABELS[category] || category
</script>

<template>
  <article class="rec-card" :class="{ 'style-match': item.styleMatched }">
    <header class="rec-head">
      <span class="category">{{ label(item.category) }}</span>
      <span class="price">${{ item.price }}</span>
    </header>

    <h3 class="name">{{ item.name }}</h3>

    <p class="reason">{{ item.reason }}</p>

    <div class="badges">
      <span v-if="item.tier" class="tag tag-neutral">{{ item.tier }} tier</span>
      <span v-if="item.styleMatched" class="tag">Matches your style</span>
    </div>

    <!-- Only rendered when the user ticked "I am new to PC building". -->
    <aside v-if="item.beginnerNote" class="beginner-note">
      <span class="beginner-label">Beginner note</span>
      <p>{{ item.beginnerNote }}</p>
    </aside>
  </article>
</template>

<style scoped>
.rec-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: border-color 0.15s ease, transform 0.12s ease;
}

.rec-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
}

/* Items chosen specifically for the user's setup style get the cyan edge. */
.rec-card.style-match {
  border-color: rgba(34, 211, 238, 0.35);
}

.rec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.category {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--secondary);
}

.price {
  font-size: 1.125rem;
  color: var(--text);
}

.name {
  font-size: 1.0625rem;
  margin-bottom: var(--space-2);
}

.reason {
  flex: 1;
  color: var(--muted);
  font-size: 0.9375rem;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--space-3);
}

.beginner-note {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--primary-soft);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
}

.beginner-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary-hover);
  margin-bottom: 4px;
}

.beginner-note p {
  font-size: 0.875rem;
  color: var(--text);
}
</style>
