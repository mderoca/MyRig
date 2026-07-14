<script setup>
defineProps({
  message: { type: String, default: 'Loading...' },
})
</script>

<template>
  <div class="loading" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <p class="muted">{{ message }}</p>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-7) var(--space-4);
  text-align: center;
}

.spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid var(--surface-light);
  border-top-color: var(--secondary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
