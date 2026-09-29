import { createApp } from 'vue'
import { createStore } from 'vuex'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import SearchView from './views/SearchView.vue'
import LibraryView from './views/LibraryView.vue'
import FavoritesView from './views/FavoritesView.vue'
import BookDetailView from './views/BookDetailView.vue'
import { sameBook } from './services/books'
import './style.css'

// Restore the saved library and remove duplicates.
const saved = (() => {
  try {
    const value = JSON.parse(localStorage.getItem('booknest-library') || '[]')
    return Array.isArray(value)
      ? value.filter(
          (book, index, list) =>
            list.findIndex(candidate => sameBook(candidate, book)) === index
        )
      : []
  } catch {
    return []
  }
})()

const store = createStore({
  state: () => ({
    books: saved,
    theme: localStorage.getItem('booknest-theme') || 'light',
    toast: '',
    searchResetVersion: 0
  }),
  getters: {
    favorites: state => state.books.filter(book => book.favorite),
    hasBook: state => candidate =>
      state.books.some(book => sameBook(book, candidate)),
    stats: state => ({
      total: state.books.length,
      read: state.books.filter(book => book.read).length,
      favorites: state.books.filter(book => book.favorite).length,
      average: state.books.filter(book => book.rating).length
        ? (
            state.books.reduce((sum, book) => sum + (book.rating || 0), 0) /
            state.books.filter(book => book.rating).length
          ).toFixed(1)
        : '—'
    }),
    bookById: state => id => state.books.find(book => book.id === id)
  },
  mutations: {
    addBook(state, book) {
      if (!state.books.some(item => item.id === book.id)) {
        state.books.unshift({
          ...book,
          favorite: false,
          read: false,
          rating: 0,
          note: '',
          addedAt: new Date().toISOString()
        })
      }
    },
    removeBook(state, id) {
      state.books = state.books.filter(book => book.id !== id)
    },
    updateBook(state, { id, field, value }) {
      const book = state.books.find(item => item.id === id)
      if (book) book[field] = value
    },
    setTheme(state, theme) {
      state.theme = theme
    },
    setToast(state, message) {
      state.toast = message
    },
    resetSearch(state) {
      state.searchResetVersion += 1
    }
  },
  actions: {
    addBook({ commit, state, dispatch }, book) {
      if (state.books.some(item => sameBook(item, book))) return false
      commit('addBook', book)
      dispatch('notify', 'Added to your library')
      return true
    },
    removeBook({ commit, dispatch }, id) {
      commit('removeBook', id)
      dispatch('notify', 'Book removed')
    },
    notify({ commit }, message) {
      commit('setToast', message)
      window.clearTimeout(window.__booknestToast)
      window.__booknestToast = window.setTimeout(
        () => commit('setToast', ''),
        2600
      )
    },
    setTheme({ commit }, theme) {
      commit('setTheme', theme)
      localStorage.setItem('booknest-theme', theme)
    }
  }
})

// Keep the library saved after every store update.
store.subscribe((_, state) => {
  localStorage.setItem('booknest-library', JSON.stringify(state.books))
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'search', component: SearchView },
    { path: '/library', name: 'library', component: LibraryView },
    { path: '/favorites', name: 'favorites', component: FavoritesView },
    { path: '/book/:id', name: 'book', component: BookDetailView }
  ]
})

createApp(App).use(store).use(router).mount('#app')
