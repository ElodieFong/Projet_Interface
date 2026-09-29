<script setup>
import SearchView from './views/SearchView.vue'
</script>

<template>
  <main class="page-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label="Booknest home">
        <span class="brand-mark">b.</span>
        <span>booknest</span>
      </a>
      <span class="header-note">A little home for your next read</span>
    </header>

    <SearchView />

    <footer class="site-footer">
      Books powered by Open Library.
    </footer>
  </main>
</template>
