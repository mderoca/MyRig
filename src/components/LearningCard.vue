<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore.js'
import * as api from '../services/api.js'

const props = defineProps({
  card: { type: Object, required: true }, // { id, title, short_description, beginner_description, category, image_url }
})

const auth = useAuthStore()

const expanded = ref(false)

const fileInput = ref(null)
const uploading = ref(false)
const uploadError = ref('')

function pickImage() {
  uploadError.value = ''
  fileInput.value?.click()
}

async function onFilePicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  try {
    const { imageUrl } = await api.uploadLearningCardImage(props.card.id, file)
    props.card.image_url = imageUrl
  } catch (err) {
    uploadError.value = err.message || 'Upload failed.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <article class="learning-card">
    <div v-if="card.image_url || auth.isAdmin" class="thumb">
      <img
        v-if="card.image_url"
        :src="card.image_url"
        :alt="card.title"
        class="thumb-img"
        loading="lazy"
      />
      <span v-else class="thumb-cat">{{ card.category }}</span>

      <template v-if="auth.isAdmin">
        <button
          type="button"
          class="admin-upload"
          :disabled="uploading"
          :aria-label="card.image_url ? `Replace image for ${card.title}` : `Upload image for ${card.title}`"
          @click="pickImage"
        >
          {{ uploading ? '...' : card.image_url ? 'Replace' : 'Upload' }}
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

    <div class="body">
      <header class="head">
        <h3 class="title">{{ card.title }}</h3>
        <span class="tag tag-neutral">{{ card.category }}</span>
      </header>

      <p class="short">{{ card.short_description }}</p>

      <button
        type="button"
        class="toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show less' : 'Explain it simply' }}
      </button>

      <p v-if="expanded" class="beginner">{{ card.beginner_description }}</p>

      <p v-if="uploadError" class="upload-error" role="alert">{{ uploadError }}</p>
    </div>
  </article>
</template>

<style scoped>
.learning-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.learning-card:hover {
  border-color: var(--border-strong);
}

.thumb {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(34, 211, 238, 0.08)),
    var(--surface-light);
  border-bottom: 1px solid var(--border);
}

.thumb-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-cat {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(249, 250, 251, 0.18);
  text-transform: uppercase;
}

.admin-upload {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 4px 10px;
  background: rgba(11, 15, 25, 0.75);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text);
  font-size: 0.75rem;
  cursor: pointer;
}

.admin-upload:disabled {
  opacity: 0.6;
  cursor: wait;
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: var(--space-5);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.title {
  font-size: 1.125rem;
}

.short {
  flex: 1;
  color: var(--muted);
  font-size: 0.9375rem;
}

.toggle {
  align-self: flex-start;
  margin-top: var(--space-4);
  padding: 0;
  background: none;
  border: none;
  color: var(--secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.toggle:hover {
  text-decoration: underline;
}

.beginner {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--primary-soft);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
}

.upload-error {
  margin-top: var(--space-2);
  color: var(--danger);
  font-size: 0.75rem;
}
</style>
