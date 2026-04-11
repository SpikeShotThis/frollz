import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'

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
      path: '/stocks',
      name: 'stocks',
      component: () => import('@/views/StocksView.vue'),
      meta: { title: 'Stocks' }
    },
    {
      path: '/rolls',
      name: 'rolls',
      component: () => import('@/views/RollsView.vue'),
      meta: { title: 'Rolls' }
    },
    {
      path: '/rolls/:key',
      name: 'roll-detail',
      component: () => import('@/views/RollDetailView.vue')
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
    const rollKey = to.name === 'roll-detail' && to.params.key ? String(to.params.key) : ''
    const pageTitle = rollKey ? `Roll ${rollKey}` : metaTitle
    document.title = pageTitle ? `${pageTitle} | Frollz` : 'Frollz'
    document.getElementById('main-content')?.focus()
  })
})

export default router