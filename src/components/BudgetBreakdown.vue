<script setup>
import { computed } from 'vue'

const props = defineProps({
  budget: { type: Object, required: true }, // { groups, total, cap, ratio, status, difference }
})

const GROUP_LABELS = {
  tower: 'PC tower',
  monitor: 'Monitor',
  peripherals: 'Keyboard / mouse / headset',
  desk: 'Desk & accessories',
}

const rows = computed(() =>
  Object.entries(GROUP_LABELS).map(([key, label]) => ({
    key,
    label,
    amount: props.budget.groups[key] || 0,
    // Width of the segment in the stacked bar, as a share of the total spend.
    share: props.budget.total
      ? ((props.budget.groups[key] || 0) / props.budget.total) * 100
      : 0,
  }))
)

/** How full the meter is. Caps at 100% so an over-budget bar does not overflow. */
const fill = computed(() => Math.min(100, (props.budget.total / props.budget.cap) * 100))

const STATUS_COPY = {
  under: 'Under budget',
  close: 'Close to budget',
  over: 'Over budget',
}

const statusLabel = computed(() => STATUS_COPY[props.budget.status])
</script>

<template>
  <section class="card budget">
    <div class="row-between head">
      <div>
        <span class="eyebrow">Full setup budget</span>
        <h2>The whole setup, not just the tower</h2>
      </div>
      <span class="status" :class="budget.status">{{ statusLabel }}</span>
    </div>

    <!-- Budget meter: how much of the selected budget this setup uses. -->
    <div class="meter-block">
      <div class="meter-labels">
        <span class="muted">Setup total</span>
        <span class="price total">${{ budget.total }}</span>
        <span class="muted">of ${{ budget.cap }}</span>
      </div>

      <div
        class="meter"
        role="meter"
        :aria-valuenow="budget.total"
        :aria-valuemin="0"
        :aria-valuemax="budget.cap"
        :aria-label="`Setup total ${budget.total} dollars of a ${budget.cap} dollar budget`"
      >
        <div class="meter-fill" :class="budget.status" :style="{ width: `${fill}%` }"></div>
      </div>

      <p class="muted meter-note">
        <template v-if="budget.status === 'over'">
          ${{ Math.abs(budget.difference) }} over your selected budget.
        </template>
        <template v-else-if="budget.status === 'close'">
          Within ${{ Math.abs(budget.difference) }} of your selected budget - a good use of it.
        </template>
        <template v-else>
          ${{ budget.difference }} left over. That is upgrade money.
        </template>
      </p>
    </div>

    <!-- Stacked bar: where the money actually went. -->
    <div class="stack-bar" aria-hidden="true">
      <span
        v-for="row in rows"
        :key="row.key"
        class="stack-seg"
        :class="row.key"
        :style="{ width: `${row.share}%` }"
      ></span>
    </div>

    <ul class="rows">
      <li v-for="row in rows" :key="row.key" class="row-item">
        <span class="swatch" :class="row.key" aria-hidden="true"></span>
        <span class="row-label">{{ row.label }}</span>
        <span class="price row-amount">${{ row.amount }}</span>
      </li>
      <li class="row-item total-row">
        <span class="row-label">Final setup total</span>
        <span class="price row-amount">${{ budget.total }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  margin-bottom: var(--space-5);
  align-items: flex-start;
}

.status {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 700;
}

.status.under {
  background: var(--success-soft);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.status.close,
.status.over {
  background: var(--warning-soft);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.meter-labels {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.total {
  font-size: 1.5rem;
  color: var(--text);
}

.meter {
  height: 12px;
  background: var(--surface-light);
  border-radius: 999px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.meter-fill.under {
  background: linear-gradient(90deg, var(--success), #34d399);
}

.meter-fill.close,
.meter-fill.over {
  background: linear-gradient(90deg, var(--warning), #fbbf24);
}

.meter-note {
  margin-top: var(--space-2);
  font-size: 0.875rem;
}

.stack-bar {
  display: flex;
  height: 8px;
  margin-top: var(--space-5);
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-light);
}

.stack-seg.tower,
.swatch.tower {
  background: var(--primary);
}

.stack-seg.monitor,
.swatch.monitor {
  background: var(--secondary);
}

.stack-seg.peripherals,
.swatch.peripherals {
  background: #a78bfa;
}

.stack-seg.desk,
.swatch.desk {
  background: #67e8f9;
}

.rows {
  margin-top: var(--space-4);
  padding: 0;
  list-style: none;
}

.row-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}

.row-label {
  flex: 1;
  color: var(--muted);
}

.row-amount {
  color: var(--text);
}

.total-row {
  border-bottom: none;
  padding-top: var(--space-4);
}

.total-row .row-label {
  color: var(--text);
  font-weight: 700;
}

.total-row .row-amount {
  font-size: 1.25rem;
  color: var(--secondary);
}
</style>
