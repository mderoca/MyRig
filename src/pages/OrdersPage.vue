<script setup>
/**
 * Order history - the Orders page from the Figma: an order number, a status, the
 * line items, and the total on the right.
 */

import { ref, onMounted } from 'vue'
import { listOrders } from '../services/api.js'
import { useCartStore } from '../stores/cartStore.js'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const cart = useCartStore()

const orders = ref([])
const loading = ref(true)
const error = ref('')

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

/** Buy the same things again - straight back into the cart. */
function reorder(order) {
  cart.addMany(
    order.items.map((item) => ({
      id: item.product_id,
      name: item.name,
      category: item.category,
      price: item.price,
    }))
  )
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    orders.value = await listOrders()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="orders section container">
    <div class="section-head">
      <span class="eyebrow">Orders</span>
      <h1>Order history</h1>
      <p>
        Every order you have placed. Checkout is simulated - no payment was taken and
        nothing ships.
      </p>
    </div>

    <LoadingState v-if="loading" message="Loading your orders..." />

    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />

    <div v-else-if="!orders.length" class="card empty">
      <h2>No orders yet</h2>
      <p class="muted">When you place an order it will appear here.</p>
      <RouterLink to="/shop" class="btn btn-lg">Go to the shop</RouterLink>
    </div>

    <div v-else class="stack">
      <article v-for="order in orders" :key="order.id" class="order card">
        <header class="order-head">
          <div>
            <h2 class="order-number">Order {{ order.order_number }}</h2>
            <p class="muted small">Ordered {{ formatDate(order.created_at) }}</p>
          </div>

          <div class="order-right">
            <span class="status" :class="order.status.toLowerCase().replace(/\s+/g, '-')">
              {{ order.status }}
            </span>
            <div class="order-total">
              <span class="muted small">Order total</span>
              <span class="price total">${{ order.total }}</span>
            </div>
          </div>
        </header>

        <ul class="items">
          <li v-for="item in order.items" :key="item.name" class="item">
            <span class="item-thumb" aria-hidden="true">{{ item.category }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.quantity > 1" class="tag tag-neutral">× {{ item.quantity }}</span>
            <span class="item-price price">${{ item.price * item.quantity }}</span>
          </li>
        </ul>

        <footer class="order-foot">
          <button class="btn btn-ghost" @click="reorder(order)">Buy again</button>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.small {
  font-size: 0.8125rem;
}

.order-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.order-number {
  font-size: 1.0625rem;
}

.order-right {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.status {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Green once it has arrived, cyan while it is moving, orange while it waits. */
.status.delivered {
  background: var(--success-soft);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.status.shipped,
.status.out-for-delivery {
  background: var(--secondary-soft);
  color: var(--secondary);
  border: 1px solid rgba(34, 211, 238, 0.35);
}

.status.processing {
  background: var(--warning-soft);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.order-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.total {
  font-size: 1.5rem;
  color: var(--text);
}

.items {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  margin: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.item-thumb {
  display: grid;
  place-items: center;
  width: 48px;
  height: 38px;
  flex: none;
  border-radius: var(--radius-sm);
  background: var(--surface-light);
  color: var(--muted);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.item-name {
  flex: 1;
  font-size: 0.9375rem;
}

.item-price {
  color: var(--muted);
}

.order-foot {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.order-foot .btn {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.empty {
  text-align: center;
  padding: var(--space-7);
}

.empty p {
  margin: var(--space-3) 0 var(--space-5);
}

@media (max-width: 640px) {
  .order-head {
    flex-direction: column;
  }

  .order-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
