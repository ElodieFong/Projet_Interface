<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { formatPublicationDate, getBook } from '../services/books'

const route = useRoute()
const router = useRouter()
const store = useStore()

const id = computed(() => decodeURIComponent(route.params.id))

const fetched = ref(null)
const loading = ref(false)
const error = ref('')

const book = computed(() =>
  store.getters.bookById(id.value) ||
  (fetched.value?.id === id.value ? fetched.value : null)
)

// Load book details when the page opens or the route changes.
async function loadBook() {
  if (store.getters.bookById(id.value)) return

  loading.value = true
  error.value = ''

  try {
    const result = await getBook(id.value)

    fetched.value = {
      ...result,
      publicationDate:
        result.publicationDate || route.query.publicationDate || '',
      year:
        result.year === 'Year unavailable' && route.query.year
          ? route.query.year
          : result.year,
      source: result.source || 'openlibrary'
    }
  } catch (e) {
    error.value = e.message || 'This book could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(loadBook)
watch(id, loadBook)

function add() {
  if (book.value) store.dispatch('addBook', book.value)
}
</script>

<template>
  <!-- Show the book information and library action. -->
  <section v-if="book" class="detail-layout">
    <RouterLink to="/" class="back-link">
      ← Back to discovery
    </RouterLink>

    <div class="detail-content">
      <div class="detail-cover">
        <img
          v-if="book.image"
          :src="book.image"
          :alt="`Cover of ${book.title}`"
        />

        <div v-else class="cover-fallback">
          ✦
        </div>
      </div>

      <div class="detail-copy">
        <p class="eyebrow">
          {{ book.categories?.[0] || 'A BOOK TO REMEMBER' }}
        </p>

        <h1>{{ book.title }}</h1>

        <p class="detail-author">
          by {{ book.authors?.join(', ') || 'Unknown author' }}
        </p>

        <p class="detail-meta">
          {{ formatPublicationDate(book.publicationDate) || book.year }}

          <span v-if="book.publisher">
            · {{ book.publisher }}
          </span>

          <span v-if="book.pageCount">
            · {{ book.pageCount }} pages
          </span>
        </p>

        <p class="detail-description">
          {{ book.description }}
        </p>

        <a
          v-if="book.infoLink"
          class="text-link"
          :href="book.infoLink"
          target="_blank"
          rel="noreferrer"
        >
          More about this book
        </a>

        <button
          v-if="!store.getters.hasBook(book)"
          class="button detail-add"
          @click="add"
        >
          + Add to my library
        </button>

        <RouterLink
          v-else
          to="/library"
          class="button detail-add"
        >
          ✓ In your library
        </RouterLink>
      </div>
    </div>
  </section>

  <section v-else class="empty-state">
    <div class="empty-icon">
      {{ loading ? '…' : '⌕' }}
    </div>

    <h2>
      {{
        loading
          ? 'Opening the book…'
          : error
            ? 'A small hiccup'
            : "Let's find that book."
      }}
    </h2>

    <p class="muted">
      {{
        error ||
        (
          loading
            ? 'Fetching book details from Open Library.'
            : 'This book could not be found. Search for it and open it from the results.'
        )
      }}
    </p>

    <button class="button" @click="router.push('/')">
      Back to search
    </button>
  </section>
</template>
