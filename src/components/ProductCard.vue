<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cartStore.js'
import { useAuthStore } from '../stores/authStore.js'
import * as api from '../services/api.js'

const props = defineProps({
  product: { type: Object, required: true },
  /** Shows a "Remove" button instead of the wishlist heart (used on the wishlist page). */
  removable: { type: Boolean, default: false },
})

const emit = defineEmits(['removed'])

const cart = useCartStore()
const auth = useAuthStore()
const router = useRouter()

const wishlisted = ref(props.removable)
const busy = ref(false)

const fileInput = ref(null)
const uploading = ref(false)
const uploadError = ref('')

function pickImage() {
  uploadError.value = ''
  fileInput.value?.click()
}

async function onFilePicked(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // let the same file be re-picked after an error
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  try {
    const { imageUrl } = await api.uploadProductImage(props.product.id, file)
    // Mutating the reactive product object is enough for the parent's v-for to
    // re-render. No emit round-trip required.
    props.product.image_url = imageUrl
  } catch (err) {
    uploadError.value = err.message || 'Upload failed.'
  } finally {
    uploading.value = false
  }
}

const CATEGORY_LABELS = {
  cpu: 'CPU',
  gpu: 'GPU',
  ram: 'RAM',
  storage: 'Storage',
  case: 'Case',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  headset: 'Headset',
  microphone: 'Microphone',
  webcam: 'Webcam',
  lighting: 'Lighting',
  desk: 'Desk',
}

const label = computed(() => CATEGORY_LABELS[props.product.category] || props.product.category)
const inCart = computed(() => cart.has(props.product.id))

async function toggleWishlist() {
  // The wishlist lives on the server against your account, so it needs one.
  if (!auth.isSignedIn) {
    return router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  }

  busy.value = true
  try {
    if (wishlisted.value) {
      await api.removeFromWishlist(props.product.id)
      wishlisted.value = false
      emit('removed', props.product)
    } else {
      await api.addToWishlist(props.product.id)
      wishlisted.value = true
    }
  } catch {
    // Non-fatal: leave the heart as it was rather than pretend it worked.
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <article class="product">
    <div class="thumb" :data-category="product.category">
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="thumb-img"
        loading="lazy"
      />
      <!-- Fallback placeholder when no image has been uploaded yet. -->
      <span v-else class="thumb-cat">{{ label }}</span>

      <button
        type="button"
        class="heart"
        :class="{ on: wishlisted }"
        :disabled="busy"
        :aria-pressed="wishlisted"
        :aria-label="wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`"
        @click="toggleWishlist"
      >
        {{ wishlisted ? '♥' : '♡' }}
      </button>

      <template v-if="auth.isAdmin">
        <button
          type="button"
          class="admin-upload"
          :disabled="uploading"
          :aria-label="product.image_url ? `Replace image for ${product.name}` : `Upload image for ${product.name}`"
          @click="pickImage"
        >
          {{ uploading ? '...' : product.image_url ? 'Replace' : 'Upload' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          @change="onFilePicked"
        />
      </template>
    </div>

    <p v-if="uploadError" class="upload-error" role="alert">{{ uploadError }}</p>

    <div class="body">
      <div class="row-between meta">
        <span class="category">{{ label }}</span>
        <span v-if="product.tier" class="tag tag-neutral">{{ product.tier }}</span>
      </div>

      <h3 class="name">{{ product.name }}</h3>
      <p class="blurb">{{ product.reason }}</p>

      <div class="foot">
        <span class="price">${{ product.price }}</span>
        <button
          class="btn add"
          :class="{ 'in-cart': inCart }"
          :disabled="product.in_stock === false"
          @click="cart.add(product)"
        >
          {{ product.in_stock === false ? 'Out of stock' : inCart ? 'Add another' : 'Add to cart' }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: border-color 0.15s ease, transform 0.12s ease;
}

.product:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
}

.thumb {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(34, 211, 238, 0.08)),
    var(--surface-light);
  border-bottom: 1px solid var(--border);
}

.thumb-cat {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(249, 250, 251, 0.18);
  text-transform: uppercase;
}

.thumb-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-upload {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 4px 10px;
  background: rgba(11, 15, 25, 0.75);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text, #f9fafb);
  font-size: 0.75rem;
  cursor: pointer;
}

.admin-upload:disabled {
  opacity: 0.6;
  cursor: wait;
}

.upload-error {
  padding: 4px 12px;
  margin: 0;
  color: var(--danger, #f87171);
  font-size: 0.75rem;
}

.heart {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(11, 15, 25, 0.7);
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.heart:hover:not(:disabled),
.heart.on {
  color: var(--danger);
  border-color: rgba(248, 113, 113, 0.5);
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--space-4);
}

.meta {
  margin-bottom: var(--space-2);
}

.category {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--secondary);
}

.name {
  font-size: 1rem;
  margin-bottom: var(--space-2);
}

.blurb {
  flex: 1;
  color: var(--muted);
  font-size: 0.875rem;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.price {
  font-size: 1.25rem;
}

.add {
  padding: 9px 16px;
  font-size: 0.875rem;
}

.add.in-cart {
  background: transparent;
  border-color: var(--secondary);
  color: var(--secondary);
}
</style>
