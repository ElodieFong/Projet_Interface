<script setup>
import BookCard from './BookCard.vue'

// Share each book with the card slot.
defineProps({
  books: { type: Array, default: () => [] },
  showAdded: Boolean
})
</script>

<template>
  <!-- Render the collection as a responsive grid. -->
  <div class="book-grid">
    <BookCard
      v-for="book in books"
      :key="book.id"
      :book="book"
      :show-added="showAdded"
    >
      <template v-if="!showAdded">
        <slot :book="book" />
      </template>
    </BookCard>
  </div>
</template>
