<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import BookGrid from '../components/BookGrid.vue'

const store = useStore()
const books = computed(() => store.getters.favorites)
</script>

<template>
  <!-- Show only books marked as favorites. -->
  <section class="page-intro">
    <div>
      <p class="eyebrow">THE ONES THAT STAY WITH YOU</p>
      <h1>Favorites<span class="heading-dot">.</span></h1>
      <p class="muted">The stories you want to keep close.</p>
    </div>
  </section>

  <section v-if="books.length" class="collection-section">
    <BookGrid :books="books">
      <template #default="{ book }">
        <button
          class="icon-button favorite-button loved"
          aria-label="Remove from favorites"
          @click="store.commit('updateBook', { id: book.id, field: 'favorite', value: false })"
        >
          ♥
        </button>
        <button
          class="icon-button delete-button"
          aria-label="Remove book"
          @click="store.dispatch('removeBook', book.id)"
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
      </template>
    </BookGrid>
  </section>

  <div v-else class="empty-state">
    <div class="empty-icon">♡</div>
    <h2>Save a little room for love.</h2>
    <p class="muted">
      Tap the heart on any book in your library and it will find a home here.
    </p>
    <RouterLink to="/library" class="button button-quiet">
      Go to your library ↗
    </RouterLink>
  </div>
</template>
