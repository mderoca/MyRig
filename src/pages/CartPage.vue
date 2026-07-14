<script setup>
/**
 * The cart, and simulated checkout.
 *
 * Checkout sends product ids and quantities only. The server re-reads every
 * price from the database and computes the total itself - the numbers on this
 * page are for the human, not for the ledger. See api/orders.js.
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cartStore.js'
import { useAuthStore } from '../stores/authStore.js'
import ErrorMessage from '../components/ErrorMessage.vue'

const cart = useCartStore()
const auth = useAuthStore()
const router = useRouter()

const placing = ref(false)
const error = ref('')
const placed = ref(null)

async function checkout() {
  if (!auth.isSignedIn) {
    return router.push({ name: 'login', query: { redirect: '/cart' } })
  }

  placing.value = true
  error.value = ''

  try {
    placed.value = await cart.checkout()
  } catch (err) {
    error.value = err.message
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <div class="cart section container">
    <!-- After checkout -->
    <div v-if="placed" class="card done">
      <span class="tick" aria-hidden="true">✓</span>
      <h1>Order placed</h1>
      <p class="muted">
        Order <strong>{{ placed.order_number }}</strong> for
        <strong class="price">${{ placed.total }}</strong> is being processed.
      </p>
      <p class="muted small">
        This is a simulated checkout - no payment was taken and nothing will ship.
      </p>
      <div class="row done-actions">
        <RouterLink to="/orders" class="btn">View orders</RouterLink>
        <RouterLink to="/shop" class="btn btn-ghost">Keep shopping</RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="section-head">
        <span class="eyebrow">Cart</span>
        <h1>Your cart</h1>
      </div>

      <div v-if="cart.isEmpty" class="card empty">
        <h2>Your cart is empty</h2>
        <p class="muted">
          Browse the shop, build a rig from scratch, or let the quiz decide for you.
        </p>
        <div class="row empty-actions">
          <RouterLink to="/shop" class="btn">Go to the shop</RouterLink>
          <RouterLink to="/quiz" class="btn btn-ghost">Take the quiz</RouterLink>
        </div>
      </div>

      <div v-else class="layout">
        <!-- Lines -->
        <section class="lines">
          <article v-for="item in cart.items" :key="item.id" class="line">
            <div class="line-thumb" aria-hidden="true">{{ item.category }}</div>

            <div class="line-body">
              <h2 class="line-name">{{ item.name }}</h2>
              <p class="muted small">{{ item.category }}</p>
            </div>

            <div class="qty">
              <button
                class="qty-btn"
                :aria-label="`Decrease quantity of ${item.name}`"
                @click="cart.setQuantity(item.id, item.quantity - 1)"
              >
                −
              </button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button
                class="qty-btn"
                :disabled="item.quantity >= cart.MAX_QUANTITY"
                :aria-label="`Increase quantity of ${item.name}`"
                @click="cart.setQuantity(item.id, item.quantity + 1)"
              >
                +
              </button>
            </div>

            <span class="line-price price">${{ item.price * item.quantity }}</span>

            <button
              class="remove"
              :aria-label="`Remove ${item.name}`"
              @click="cart.remove(item.id)"
            >
              ×
            </button>
          </article>

          <button class="btn btn-ghost clear" @click="cart.clear()">Empty cart</button>
        </section>

        <!-- Summary -->
        <aside class="summary card">
          <h2>Summary</h2>

          <dl class="totals">
            <div class="total-row">
              <dt class="muted">Items</dt>
              <dd>{{ cart.count }}</dd>
            </div>
            <div class="total-row">
              <dt class="muted">Subtotal</dt>
              <dd class="price">${{ cart.subtotal }}</dd>
            </div>
            <div class="total-row">
              <dt class="muted">Shipping</dt>
              <dd class="free">Free</dd>
            </div>
            <div class="total-row grand">
              <dt>Total</dt>
              <dd class="price">${{ cart.subtotal }}</dd>
            </div>
          </dl>

          <ErrorMessage v-if="error" :message="error" class="summary-error" />

          <button class="btn btn-lg full" :disabled="placing" @click="checkout">
            {{ placing ? 'Placing order...' : auth.isSignedIn ? 'Place order' : 'Sign in to order' }}
          </button>

          <p class="muted small note">
            Simulated checkout. No card details are collected, and nothing ships.
          </p>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.small {
  font-size: 0.8125rem;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-6);
  align-items: start;
}

/* ---------- Lines ---------- */
.lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.line {
  display: grid;
  grid-template-columns: 56px 1fr auto auto auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.line-thumb {
  display: grid;
  place-items: center;
  width: 56px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: var(--surface-light);
  color: var(--muted);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.line-name {
  font-size: 0.9375rem;
}

.qty {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--surface-light);
  border-radius: 999px;
}

.qty-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--text);
  cursor: pointer;
}

.qty-btn:hover:not(:disabled) {
  background: var(--surface);
}

.qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qty-value {
  min-width: 24px;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.line-price {
  min-width: 70px;
  text-align: right;
}

.remove {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--muted);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.remove:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.clear {
  align-self: flex-start;
  margin-top: var(--space-2);
  padding: 8px 16px;
  font-size: 0.875rem;
}

/* ---------- Summary ---------- */
.summary {
  position: sticky;
  top: 100px;
}

.totals {
  margin: var(--space-4) 0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding-block: var(--space-2);
}

.total-row dd {
  margin: 0;
}

.free {
  color: var(--success);
  font-weight: 600;
}

.grand {
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
  font-weight: 700;
}

.grand .price {
  font-size: 1.375rem;
  color: var(--secondary);
}

.full {
  width: 100%;
}

.summary-error {
  margin-bottom: var(--space-4);
}

.note {
  margin-top: var(--space-3);
  text-align: center;
}

/* ---------- States ---------- */
.empty,
.done {
  text-align: center;
  padding: var(--space-7);
}

.empty p,
.done p {
  margin: var(--space-3) auto 0;
  max-width: 46ch;
}

.empty-actions,
.done-actions {
  justify-content: center;
  margin-top: var(--space-5);
}

.tick {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-4);
  border-radius: 50%;
  background: var(--success-soft);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: var(--success);
  font-size: 1.5rem;
  font-weight: 800;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .summary {
    position: static;
  }

  .line {
    grid-template-columns: 48px 1fr auto;
    row-gap: var(--space-3);
  }

  .line-price {
    grid-column: 2;
    text-align: left;
  }
}
</style>
