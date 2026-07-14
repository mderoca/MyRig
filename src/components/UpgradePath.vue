<script setup>
import { computed } from 'vue'
import UpgradeCard from './UpgradeCard.vue'

const props = defineProps({
  upgrades: { type: Array, required: true },
})

/** What it would cost to do every suggested upgrade. */
const totalCost = computed(() =>
  props.upgrades.reduce((sum, u) => sum + Number(u.estimated_cost || 0), 0)
)
</script>

<template>
  <section class="upgrade-path">
    <div class="section-head">
      <span class="eyebrow">Upgrade path</span>
      <h2>What to improve later</h2>
      <p>
        A setup is not a one-time purchase. These are the next things worth buying for
        this specific build, in the order they will actually make a difference.
        Doing all of them would cost about
        <strong class="price">${{ totalCost }}</strong>.
      </p>
    </div>

    <div class="grid grid-3">
      <UpgradeCard
        v-for="upgrade in upgrades"
        :key="upgrade.upgrade_name"
        :upgrade="upgrade"
      />
    </div>
  </section>
</template>

<style scoped>
.section-head strong {
  color: var(--secondary);
}
</style>
