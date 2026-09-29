<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import BookGrid from '../components/BookGrid.vue'

const store = useStore()
const query = ref('')
const status = ref('all')
const sort = ref('added')
const stats = computed(() => store.getters.stats)

// Apply the search, status filter, and selected sort order.
const books = computed(() => {
  let result = store.state.books.filter(
    book =>
      book.title.toLowerCase().includes(query.value.toLowerCase()) ||
      book.authors.join(' ').toLowerCase().includes(query.value.toLowerCase())
  )

  if (status.value === 'read') result = result.filter(book => book.read)
  if (status.value === 'unread') result = result.filter(book => !book.read)
  if (status.value === 'favorites') {
    result = result.filter(book => book.favorite)
  }

  return [...result].sort((a, b) =>
    sort.value === 'title'
      ? a.title.localeCompare(b.title)
      : sort.value === 'year'
        ? String(b.year).localeCompare(String(a.year))
        : b.addedAt.localeCompare(a.addedAt)
  )
})

// Ask before removing a book from the library.
function remove(book) {
  if (window.confirm(`Remove “${book.title}” from your library?`)) {
    store.dispatch('removeBook', book.id)
  }
}
</script>

<template>
  <!-- Show collection totals and library controls. -->
  <section class="page-intro">
    <div>
      <p class="eyebrow">YOUR PERSONAL COLLECTION</p>
      <h1>My library<span class="heading-dot">.</span></h1>
      <p class="muted">Every book you mean to read, in one lovely place.</p>
    </div>
    <RouterLink to="/" class="button">Find a book</RouterLink>
  </section>

  <section class="stats-row">
    <div class="stat-card">
      <span class="stat-number">{{ stats.total }}</span>
      <span class="stat-label">books collected</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">{{ stats.read }}</span>
      <span class="stat-label">read so far</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">{{ stats.favorites }}</span>
      <span class="stat-label">favorites</span>
    </div>
    <div class="stat-card">
      <span class="stat-number">
        {{ stats.average }}
        <small v-if="stats.average !== '—'">/5</small>
      </span>
      <span class="stat-label">average rating</span>
    </div>
  </section>

  <section class="collection-section">
    <div class="collection-toolbar">
      <h2>Your shelf <span class="muted">{{ books.length }}</span></h2>
      <div class="toolbar-fields">
        <input
          v-model="query"
          class="filter-input"
          placeholder="Search your books…"
          aria-label="Search your books"
        />
        <select v-model="status" aria-label="Filter by status">
          <option value="all">All books</option>
          <option value="unread">Want to read</option>
          <option value="read">Read</option>
          <option value="favorites">Favorites</option>
        </select>
        <select v-model="sort" aria-label="Sort books">
          <option value="added">Recently added</option>
          <option value="title">Title A–Z</option>
          <option value="year">Newest year</option>
        </select>
      </div>
    </div>

    <div v-if="!store.state.books.length" class="empty-state">
      <div class="empty-icon">✳</div>
      <h2>Your shelf is waiting.</h2>
      <p class="muted">
        Search for a book and add it here. Your collection stays yours, even
        after you close the page.
      </p>
      <RouterLink to="/" class="button">
        Discover your first book ↗
      </RouterLink>
    </div>
    <div v-else-if="!books.length" class="state-message">
      No books match those filters. Try a different search.
    </div>

    <BookGrid v-else :books="books">
      <template #default="{ book }">
        <button
          class="icon-button favorite-button"
          :class="{ loved: book.favorite }"
          :aria-label="book.favorite ? 'Remove from favorites' : 'Add to favorites'"
          @click="store.commit('updateBook', { id: book.id, field: 'favorite', value: !book.favorite })"
        >
          {{ book.favorite ? '♥' : '♡' }}
        </button>
        <button
          class="icon-button delete-button"
          aria-label="Remove book"
          @click="remove(book)"
        >
          ×
        </button>

        <div class="library-actions">
          <button
            class="status-toggle"
            :class="{ done: book.read }"
            @click="store.commit('updateBook', { id: book.id, field: 'read', value: !book.read })"
          >
            {{ book.read ? '✓ Read' : '○ To read' }}
          </button>
        </div>

        <div class="book-personal">
          <label>
            My rating
            <select
              :value="book.rating"
              :aria-label="`Rating for ${book.title}`"
              @change="store.commit('updateBook', { id: book.id, field: 'rating', value: Number($event.target.value) })"
            >
              <option value="0">—</option>
              <option v-for="n in 5" :key="n" :value="n">
                {{ n }} / 5
              </option>
            </select>
          </label>
          <textarea
            :value="book.note"
            :aria-label="`Note for ${book.title}`"
            placeholder="A thought to remember…"
            rows="2"
            @input="store.commit('updateBook', { id: book.id, field: 'note', value: $event.target.value })"
          ></textarea>
        </div>
      </template>
    </BookGrid>
  </section>
</template>
