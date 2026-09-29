<script setup>
import { computed, ref } from 'vue'
import { sameBook, searchBooks } from '../services/books'

const query = ref('')
const books = ref([])
const total = ref(0)
const startIndex = ref(0)
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const selectedBook = ref(null)
const sort = ref('relevance')
const requestToken = ref(0)

// Keep the API order for relevance and sort other fields locally.
const sortedBooks = computed(() => {
  const results = [...books.value]

  if (sort.value === 'title-asc') {
    return results.sort((first, second) =>
      first.title.localeCompare(second.title)
    )
  }
  if (sort.value === 'title-desc') {
    return results.sort((first, second) =>
      second.title.localeCompare(first.title)
    )
  }
  if (sort.value === 'year-new') {
    return results.sort((first, second) =>
      second.year.localeCompare(first.year)
    )
  }
  if (sort.value === 'year-old') {
    return results.sort((first, second) =>
      first.year.localeCompare(second.year)
    )
  }

  return results
})

// Search Open Library and update the visible results.
async function search(nextPage = false) {
  if (!query.value.trim() || loading.value) return

  if (!nextPage) {
    books.value = []
    total.value = 0
    startIndex.value = 0
    searched.value = true
    selectedBook.value = null
  }

  loading.value = true
  error.value = ''
  const currentToken = ++requestToken.value

  try {
    const result = await searchBooks(query.value.trim(), startIndex.value)
    if (currentToken !== requestToken.value) return

    if (nextPage) {
      const combined = [...books.value]
      result.books.forEach(book => {
        if (!combined.some(existing => sameBook(existing, book))) {
          combined.push(book)
        }
      })
      books.value = combined
    } else {
      books.value = result.books.filter(
        (book, index, list) =>
          list.findIndex(candidate => sameBook(candidate, book)) === index
      )
    }

    total.value = result.total
    startIndex.value = result.nextIndex
  } catch (searchError) {
    if (currentToken === requestToken.value) {
      error.value =
        searchError.message || 'Something went wrong. Please try again.'
    }
  } finally {
    if (currentToken === requestToken.value) loading.value = false
  }
}

function chooseSuggestion(suggestion) {
  query.value = suggestion
  search()
}

function publicationDate(book) {
  return book.publicationDate || book.year
}
</script>

<template>
  <section class="hero" id="top">
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
      <button class="button" type="submit" :disabled="!query.trim() || loading">
        {{ loading && !books.length ? 'Searching…' : 'Search books' }}
      </button>
    </form>

    <div v-if="!searched" class="suggestion-row">
      <span class="muted">A few places to start</span>
      <button
        v-for="suggestion in ['omniscient reader\'s viewpoint', 'Kotteri', 'Harry Potter']"
        :key="suggestion"
        class="chip"
        @click="chooseSuggestion(suggestion)"
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

    <div v-else class="book-grid">
      <article v-for="book in sortedBooks" :key="book.id" class="book-card">
        <button
          class="book-select"
          :aria-label="`View details for ${book.title}`"
          @click="selectedBook = book"
        >
          <span class="cover" :class="{ 'cover-empty': !book.image }">
            <img v-if="book.image" :src="book.image" :alt="`Cover of ${book.title}`" loading="lazy" />
            <span v-else class="cover-fallback">✦<small>cover unavailable</small></span>
          </span>
          <span class="card-content">
            <span class="eyebrow">{{ publicationDate(book) }}</span>
            <span class="book-title">{{ book.title }}</span>
            <span class="muted authors">
              {{ book.authors.join(', ') || 'Unknown author' }}
            </span>
            <span class="select-label">View book details</span>
          </span>
        </button>
      </article>
    </div>

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

  <div
    v-if="selectedBook"
    class="modal-backdrop"
    role="presentation"
    @click.self="selectedBook = null"
  >
    <section
      class="book-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedBook.title"
    >
      <button
        class="modal-close"
        aria-label="Close book details"
        @click="selectedBook = null"
      >
        ×
      </button>
      <div class="modal-cover">
        <img
          v-if="selectedBook.image"
          :src="selectedBook.image"
          :alt="`Cover of ${selectedBook.title}`"
        />
        <span v-else class="cover-fallback">✦</span>
      </div>
      <div class="modal-copy">
        <p class="eyebrow">BOOK DETAILS</p>
        <h2>{{ selectedBook.title }}</h2>
        <p class="detail-author">
          by {{ selectedBook.authors.join(', ') || 'Unknown author' }}
        </p>
        <p class="detail-meta">{{ publicationDate(selectedBook) }}</p>
        <p class="detail-description">{{ selectedBook.description }}</p>
        <a
          class="text-link"
          :href="selectedBook.infoLink"
          target="_blank"
          rel="noreferrer"
        >
          More about this book
        </a>
      </div>
    </section>
  </div>
</template>
