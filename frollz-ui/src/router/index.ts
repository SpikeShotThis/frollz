import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import StocksView from '@/views/StocksView.vue'
import RollsView from '@/views/RollsView.vue'
import RollDetailView from '@/views/RollDetailView.vue'
import FilmFormatsView from '@/views/FilmFormatsView.vue'
import TagsView from '@/views/TagsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { title: 'Dashboard' }
    },
    {
      path: '/emulsions',
      name: 'emulsions',
      component: () => import('@/views/EmulsionsView.vue'),
      meta: { title: 'Emulsions' }
    },
    {
      path: '/films',
      name: 'films',
      component: () => import('@/views/FilmsView.vue'),
      meta: { title: 'Films' }
    },
    {
      path: '/films/:key',
      name: 'film-detail',
      component: () => import('@/views/FilmDetailView.vue')
    },
    {
      path: '/rolls/:key',
      name: 'roll-detail',
      component: RollDetailView
    },
    {
      path: '/formats',
      name: 'formats',
      component: () => import('@/views/FilmFormatsView.vue'),
      meta: { title: 'Film Formats' }
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/views/TagsView.vue'),
      meta: { title: 'Tags' }
    }
  ]
})

// Update page title and move focus to <main> after each navigation (WCAG 2.4.2 Page Titled)
router.afterEach((to) => {
  nextTick(() => {
    const metaTitle = typeof to.meta.title === 'string' ? to.meta.title : ''
    const filmKey = to.name === 'film-detail' && to.params.key ? String(to.params.key) : ''
    const pageTitle = filmKey ? `Film ${filmKey}` : metaTitle
    document.title = pageTitle ? `${pageTitle} | Frollz` : 'Frollz'
    document.getElementById('main-content')?.focus()
  })
})

export default router