<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const count = computed(() => store.state.books.length)
const theme = computed(() => store.state.theme)

function toggleTheme() {
  store.dispatch('setTheme', theme.value === 'light' ? 'dark' : 'light')
}

function clearSearch() {
  store.commit('resetSearch')
}
</script>

<template>
  <div class="app-shell" :data-theme="theme">
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">b.</span>
        <span>booknest</span>
      </RouterLink>

      <nav class="main-nav" aria-label="Main navigation">
        <RouterLink to="/" exact-active-class="active" @click="clearSearch">
          Discover
        </RouterLink>
        <RouterLink to="/library" active-class="active">
          My library <span class="nav-count">{{ count }}</span>
        </RouterLink>
        <RouterLink to="/favorites" active-class="active">
          Favorites
        </RouterLink>
      </nav>

      <button
        class="theme-toggle"
        :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`"
        @click="toggleTheme"
      >
        {{ theme === 'light' ? '☾' : '☀' }}
      </button>
    </header>

    <main class="page">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <footer class="footer">
      <span>
        Library management project by Elodie Fong and Maelys de Crouy-Chanel.
      </span>
    </footer>

    <Transition name="toast">
      <div v-if="store.state.toast" class="toast" role="status">
        ✦ &nbsp;{{ store.state.toast }}
      </div>
    </Transition>
  </div>
</template>
