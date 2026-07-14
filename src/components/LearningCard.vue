<script setup>
import { ref } from 'vue'

defineProps({
  card: { type: Object, required: true }, // { title, short_description, beginner_description, category }
})

const expanded = ref(false)
</script>

<template>
  <article class="learning-card">
    <header class="head">
      <h3 class="title">{{ card.title }}</h3>
      <span class="tag tag-neutral">{{ card.category }}</span>
    </header>

    <p class="short">{{ card.short_description }}</p>

    <button
      type="button"
      class="toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : 'Explain it simply' }}
    </button>

    <p v-if="expanded" class="beginner">{{ card.beginner_description }}</p>
  </article>
</template>

<style scoped>
.learning-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: border-color 0.15s ease;
}

.learning-card:hover {
  border-color: var(--border-strong);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.title {
  font-size: 1.125rem;
}

.short {
  flex: 1;
  color: var(--muted);
  font-size: 0.9375rem;
}

.toggle {
  align-self: flex-start;
  margin-top: var(--space-4);
  padding: 0;
  background: none;
  border: none;
  color: var(--secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.toggle:hover {
  text-decoration: underline;
}

.beginner {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--primary-soft);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
}
</style>
