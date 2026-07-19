<script setup>
/**
 * The compatibility verdict for a generated build.
 *
 * Shows every check that ran, INCLUDING the ones that passed, and states plainly
 * what is not checked. "Compatible" should mean "these specific things were
 * verified", not an unqualified claim - MyRig checks three rules, not every rule
 * a full build validator would.
 *
 * The engine guarantees compatible builds (incompatible parts are filtered
 * before scoring), so the failed state should never appear from the quiz. It is
 * rendered anyway rather than assumed away - if a data change ever breaks the
 * guarantee, showing it beats hiding it.
 */
defineProps({
  // { ok, checks: [{key, label, ok, detail}], draw, required, notChecked[] }
  compatibility: { type: Object, required: true },
})
</script>

<template>
  <section class="card compatibility" :class="compatibility.ok ? 'is-ok' : 'is-broken'">
    <div class="head">
      <span class="eyebrow">Compatibility</span>
      <span class="verdict" :class="compatibility.ok ? 'verdict-ok' : 'verdict-broken'">
        {{ compatibility.ok ? 'All checks passed' : 'Not compatible' }}
      </span>
    </div>

    <h2 class="title">
      {{ compatibility.ok ? 'These parts fit together' : 'These parts do not fit together' }}
    </h2>

    <p class="body">
      The build draws about <strong>{{ compatibility.draw }}W</strong> under load, so it needs a
      power supply of at least <strong>{{ compatibility.required }}W</strong> once headroom is
      included.
    </p>

    <ul class="checks">
      <li v-for="check in compatibility.checks" :key="check.key" class="check">
        <span class="mark" :class="check.ok ? 'mark-ok' : 'mark-bad'" aria-hidden="true">
          {{ check.ok ? '✓' : '✕' }}
        </span>
        <div>
          <strong>{{ check.label }}</strong>
          <p class="muted">{{ check.detail }}</p>
        </div>
      </li>
    </ul>

    <p v-if="compatibility.notChecked?.length" class="not-checked muted">
      <strong>Not checked:</strong> {{ compatibility.notChecked.join(', ') }}. MyRig verifies
      socket, memory generation and power draw - it is not a full build validator.
    </p>
  </section>
</template>

<style scoped>
.compatibility {
  position: relative;
  overflow: hidden;
}

.compatibility::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--success);
}

.is-broken::before {
  background: var(--danger);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.verdict {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.verdict-ok {
  color: var(--success);
  border-color: var(--success);
  background: var(--success-soft);
}

.verdict-broken {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-soft);
}

.title {
  margin-bottom: var(--space-2);
}

.body {
  color: var(--muted);
  max-width: 62ch;
  margin-bottom: var(--space-5);
}

.checks {
  display: grid;
  gap: var(--space-4);
  padding: 0;
  margin: 0;
  list-style: none;
}

.check {
  display: flex;
  gap: var(--space-3);
}

.mark {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}

.mark-ok {
  color: var(--success);
  background: var(--success-soft);
}

.mark-bad {
  color: var(--danger);
  background: var(--danger-soft);
}

.check p {
  font-size: 0.9375rem;
  margin-top: 2px;
}

.not-checked {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
  font-size: 0.875rem;
  max-width: 62ch;
}
</style>
