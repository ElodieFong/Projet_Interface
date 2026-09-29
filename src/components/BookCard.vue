<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { formatPublicationDate } from '../services/books'

const props = defineProps({
  book: { type: Object, required: true },
  showAdded: Boolean
})

const store = useStore()

// Find the matching saved copy of this book.
const savedBook = computed(
  () =>
    store.state.books.find(book => book.id === props.book.id) ||
    store.state.books.find(book => store.getters.hasBook(props.book))
)
const inLibrary = computed(() => Boolean(savedBook.value))

function add() {
  store.dispatch('addBook', props.book)
}

function remove() {
  store.dispatch('removeBook', savedBook.value?.id || props.book.id)
}
</script>

<template>
  <!-- Show book details and its library action. -->
  <article class="book-card">
    <RouterLink
      class="cover-link"
      :to="{
        name: 'book',
        params: { id: book.id },
        query: book.source === 'openlibrary'
          ? { source: book.source, year: book.year }
          : {}
      }"
      :aria-label="`View ${book.title}`"
    >
      <div class="cover" :class="{ 'cover-empty': !book.image }">
        <img
          v-if="book.image"
          :src="book.image"
          :alt="`Cover of ${book.title}`"
          loading="lazy"
        />
        <span v-else class="cover-fallback">
          ✦<small>cover unavailable</small>
        </span>
      </div>
    </RouterLink>

    <div class="card-content">
      <p class="eyebrow">
        {{ formatPublicationDate(book.publicationDate) || book.year }}
        <span class="source-label">
          · {{ book.source === 'openlibrary' ? 'Open Library' : 'Your library' }}
        </span>
      </p>

      <RouterLink
        class="book-title"
        :to="{
          name: 'book',
          params: { id: book.id },
          query: book.source === 'openlibrary'
            ? {
                source: book.source,
                year: book.year,
                publicationDate: book.publicationDate
              }
            : {}
        }"
      >
        {{ book.title }}
      </RouterLink>

      <p class="muted authors">
        {{ book.authors?.join(', ') || 'Unknown author' }}
      </p>

      <button
        v-if="showAdded && inLibrary"
        class="button button-small remove-book-button"
        @click="remove"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path
            d="M2.5 4.5h11M6 4.5V2.8h4v1.7m2.1 0-.6 8.2H4.5l-.6-8.2M6.5 7v3.8M9.5 7v3.8"
          />
        </svg>
        Remove from library
      </button>
      <button v-else-if="showAdded" class="button button-small" @click="add">
        + Add to library
      </button>
      <slot v-else />
    </div>
  </article>
</template>
