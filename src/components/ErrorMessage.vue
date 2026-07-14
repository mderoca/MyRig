<script setup>
defineProps({
  message: { type: String, required: true },
  /** When true, shows a Try again button and emits `retry`. */
  retryable: { type: Boolean, default: false },
})

defineEmits(['retry'])
</script>

<template>
  <div class="error" role="alert">
    <span class="icon" aria-hidden="true">!</span>
    <div class="body">
      <p>{{ message }}</p>
      <button v-if="retryable" class="btn btn-ghost btn-retry" @click="$emit('retry')">
        Try again
      </button>
    </div>
  </div>
</template>

<style scoped>
.error {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--danger-soft);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: var(--radius);
}

.icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--danger);
  color: #1a0a0a;
  font-weight: 800;
  font-size: 0.875rem;
}

.body p {
  color: var(--text);
}

.btn-retry {
  margin-top: var(--space-3);
  padding: 8px 16px;
  font-size: 0.875rem;
}
</style>
