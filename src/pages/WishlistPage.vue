<script setup>
/**
 * The wishlist. Reuses ProductCard - a wishlisted product is just a product with
 * the heart already filled in, and removing it drops it from this list.
 */

import { ref, onMounted } from 'vue'
import { listWishlist } from '../services/api.js'
import { useCartStore } from '../stores/cartStore.js'
import ProductCard from '../components/ProductCard.vue'
import LoadingState from '../components/LoadingState.vue'
import ErrorMessage from '../components/ErrorMessage.vue'

const cart = useCartStore()

const items = ref([])
const loading = ref(true)
const error = ref('')

/** ProductCard tells us when its heart was un-filled; drop the row here too. */
function onRemoved(product) {
  items.value = items.value.filter((item) => item.id !== product.id)
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    items.value = await listWishlist()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="wishlist section container">
    <div class="row-between head">
      <div class="section-head no-margin">
        <span class="eyebrow">Wishlist</span>
        <h1>Saved for later</h1>
        <p>The parts you are thinking about. Nothing here is reserved or in your cart.</p>
      </div>

      <button
        v-if="items.length"
        class="btn"
        @click="cart.addMany(items)"
      >
        Add all to cart
      </button>
    </div>

    <LoadingState v-if="loading" message="Loading your wishlist..." />

    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />

    <div v-else-if="!items.length" class="card empty">
      <h2>Your wishlist is empty</h2>
      <p class="muted">Tap the heart on any product in the shop to save it here.</p>
      <RouterLink to="/shop" class="btn btn-lg">Go to the shop</RouterLink>
    </div>

    <div v-else class="grid product-grid">
      <ProductCard
        v-for="product in items"
        :key="product.id"
        :product="product"
        removable
        @removed="onRemoved"
      />
    </div>
  </div>
</template>

<style scoped>
.head {
  align-items: flex-start;
  margin-bottom: var(--space-5);
}

.no-margin {
  margin-bottom: 0;
}

.product-grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.empty {
  text-align: center;
  padding: var(--space-7);
}

.empty p {
  margin: var(--space-3) 0 var(--space-5);
}
</style>
