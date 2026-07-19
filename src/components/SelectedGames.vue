<script setup>
import { useSetupStore } from '../stores/setupStore.js'

const store = useSetupStore()
</script>

<template>
  <div class="selected">
    <div class="row-between">
      <h3>Your games</h3>
      <span class="muted count">{{ store.selectedGames.length }} selected</span>
    </div>

    <p v-if="!store.selectedGames.length" class="muted hint">
      Nothing selected yet. Your games shape the whole build - the genres and tags
      IGDB returns are what tell MyRig whether you need frames or fidelity.
    </p>

    <ul v-else class="tags">
      <li v-for="game in store.selectedGames" :key="game.id" class="game-tag">
        <img v-if="game.image" :src="game.image" :alt="''" class="avatar" loading="lazy" />
        <span class="name">{{ game.name }}</span>
        <button
          type="button"
          class="remove"
          :aria-label="`Remove ${game.name}`"
          @click="store.removeGame(game.id)"
        >
          ×
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.count {
  font-size: 0.875rem;
}

.hint {
  margin-top: var(--space-3);
  font-size: 0.9375rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: 0;
  list-style: none;
}

.game-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 4px;
  background: var(--secondary-soft);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
}

.name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--secondary);
}

.remove {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--secondary);
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
}

.remove:hover {
  background: rgba(34, 211, 238, 0.2);
}
</style>
