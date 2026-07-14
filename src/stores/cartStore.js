/**
 * The shopping cart.
 *
 * Lives entirely in the browser (Pinia + localStorage). There is no cart table:
 * a cart is a scratchpad, and losing it is not a data loss event.
 *
 * IMPORTANT: the prices held here are for DISPLAY ONLY. When the order is
 * placed, only product ids and quantities are sent - the server looks the prices
 * up again in the database and computes the total itself. Nothing a user can
 * edit in this store can change what they are charged. See api/orders.js.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../services/api.js'

const STORAGE_KEY = 'myrig_cart'
const MAX_QUANTITY = 10

function loadPersisted() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', () => {
  /** [{ id, name, category, price, quantity }] */
  const items = ref(loadPersisted())

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, i) => sum + i.price * i.quantity, 0))
  const isEmpty = computed(() => items.value.length === 0)

  const has = (productId) => items.value.some((i) => i.id === productId)

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
    } catch {
      // Storage blocked or full - the cart still works for this page view.
    }
  }

  function add(product, quantity = 1) {
    const existing = items.value.find((i) => i.id === product.id)

    if (existing) {
      existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity)
    } else {
      items.value.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: Math.min(MAX_QUANTITY, quantity),
      })
    }

    persist()
  }

  function setQuantity(productId, quantity) {
    const item = items.value.find((i) => i.id === productId)
    if (!item) return

    const next = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity) || 0))
    if (next === 0) return remove(productId)

    item.quantity = next
    persist()
  }

  function remove(productId) {
    items.value = items.value.filter((i) => i.id !== productId)
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  /** Adds every item of a recommended setup at once. Used by the quiz result and the builder. */
  function addMany(products) {
    for (const product of products) {
      if (product?.id) add(product, 1)
    }
  }

  /** Places the order. Sends ids and quantities only - never prices. */
  async function checkout() {
    const order = await api.placeOrder(
      items.value.map((item) => ({ productId: item.id, quantity: item.quantity }))
    )
    clear()
    return order
  }

  return {
    items,
    count,
    subtotal,
    isEmpty,
    has,
    add,
    addMany,
    setQuantity,
    remove,
    clear,
    checkout,
    MAX_QUANTITY,
  }
})
