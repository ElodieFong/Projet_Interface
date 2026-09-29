<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { sameBook, searchBooks } from '../services/books'
import BookGrid from '../components/BookGrid.vue'

const query = ref('')
const books = ref([])
const total = ref(0)
const startIndex = ref(0)
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const store = useStore()
const requestToken = ref(0)
const sort = ref('relevance')

function clearSearch() {
  // Ignore any search that is still running.
  requestToken.value += 1
  query.value = ''
  books.value = []
  total.value = 0
  startIndex.value = 0
  loading.value = false
  error.value = ''
  searched.value = false
  sort.value = 'relevance'
}

watch(() => store.state.searchResetVersion, clearSearch)

function publicationTime(book) {
  const date = book.publicationDate || book.year
  const parsed = Date.parse(date)

  if (Number.isFinite(parsed)) return parsed

  const year = Number(String(date).match(/\d{4}/)?.[0])
  return year ? new Date(year, 0, 1).getTime() : null
}

const sortedBooks = computed(() => {
  // Keep the API order when relevance is selected.
  const result = [...books.value]

  if (sort.value === 'title-asc') {
    return result.sort((a, b) => a.title.localeCompare(b.title))
  }
  if (sort.value === 'title-desc') {
    return result.sort((a, b) => b.title.localeCompare(a.title))
  }
  if (sort.value === 'year-new') {
    return result.sort(
      (a, b) =>
        (publicationTime(b) ?? -Infinity) - (publicationTime(a) ?? -Infinity)
    )
  }
  if (sort.value === 'year-old') {
    return result.sort(
      (a, b) =>
        (publicationTime(a) ?? Infinity) - (publicationTime(b) ?? Infinity)
    )
  }

  return result
})

async function search(next = false) {
  if (!query.value.trim() || loading.value) return

  if (!next) {
    startIndex.value = 0
    books.value = []
    total.value = 0
    searched.value = true
  }

  loading.value = true
  error.value = ''
  const currentToken = ++requestToken.value

  try {
    // Load one page of books from Open Library.
    const result = await searchBooks(query.value.trim(), startIndex.value)
    if (currentToken !== requestToken.value) return

    if (next) {
      // Skip books already shown on the page.
      const combined = [...books.value]
      result.books.forEach(book => {
        if (!combined.some(existing => sameBook(existing, book))) {
          combined.push(book)
        }
      })
      books.value = combined
      startIndex.value = result.nextIndex
    } else {
      books.value = result.books.filter(
        (book, index, list) =>
          list.findIndex(candidate => sameBook(candidate, book)) === index
      )
      startIndex.value = result.nextIndex
    }

    total.value = result.total
    if (next && !result.books.length) total.value = books.value.length
  } catch (e) {
    if (currentToken === requestToken.value) {
      error.value = e.message || 'Something went wrong. Please try again.'
    }
  } finally {
    if (currentToken === requestToken.value) loading.value = false
  }
}
</script>

<template>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
      <h1>Find a book.<br /><em>Keep the feeling.</em></h1>
      <p class="hero-sub">
        A little home for all the stories you love, and the ones you haven't
        found yet.
      </p>
    </div>
    <div class="hero-art" aria-hidden="true">
      <span class="sun-disc"></span>
      <div class="book-shape book-a"></div>
      <div class="book-shape book-b"></div>
      <div class="book-shape book-c"></div>
      <span class="art-spark">✳</span>
    </div>
  </section>

  <section class="search-section">
    <form class="search-bar" @submit.prevent="search()">
      <input
        v-model="query"
        aria-label="Search books"
        placeholder="Try a title or an author"
      />
      <button
        class="button"
        type="submit"
        :disabled="!query.trim() || loading"
      >
        {{ loading && !books.length ? 'Searching…' : 'Search books' }}
      </button>
    </form>

    <div v-if="!searched" class="suggestion-row">
      <span class="muted">A few places to start</span>
      <button
        v-for="suggestion in ['omniscient reader\'s viewpoint', 'Kotteri', 'Harry Potter']"
        :key="suggestion"
        class="chip"
        @click="query = suggestion; search()"
      >
        {{ suggestion }}
      </button>
    </div>
  </section>

  <section v-if="searched" class="results-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">THE BOOKSHELF</p>
        <h2>
          {{
            error
              ? 'A small hiccup'
              : books.length
                ? 'A good place to start'
                : loading
                  ? 'Looking for your next read…'
                  : 'Nothing on this shelf yet'
          }}
        </h2>
      </div>

      <div v-if="total" class="results-tools">
        <span class="muted">
          Showing {{ books.length }} of {{ total.toLocaleString() }} books
        </span>
        <label class="sort-label">
          Sort by
          <select v-model="sort" aria-label="Sort search results">
            <option value="relevance">Relevance</option>
            <option value="title-asc">Title A–Z</option>
            <option value="title-desc">Title Z–A</option>
            <option value="year-new">Latest</option>
            <option value="year-old">Oldest</option>
          </select>
        </label>
      </div>
    </div>

    <p v-if="error" class="state-message error-message">{{ error }}</p>
    <div v-else-if="loading && !books.length" class="loading-state">
      <span class="spinner"></span> Finding books for you…
    </div>
    <div v-else-if="!books.length" class="state-message">
      Try another title, author, or a broader search.
    </div>
    <BookGrid v-else :books="sortedBooks" show-added />

    <div v-if="startIndex < total && books.length" class="load-more">
      <button
        class="button button-quiet"
        :disabled="loading"
        @click="search(true)"
      >
        {{ loading ? 'Loading…' : 'Show me more' }} ↓
      </button>
    </div>
  </section>
</template>
