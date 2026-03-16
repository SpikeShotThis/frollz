import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import StocksView from '@/views/StocksView.vue'
import RollsView from '@/views/RollsView.vue'
import FilmFormatsView from '@/views/FilmFormatsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/stocks',
      name: 'stocks',
      component: StocksView
    },
    {
      path: '/rolls',
      name: 'rolls',
      component: RollsView
    },
    {
      path: '/formats',
      name: 'formats',
      component: FilmFormatsView
    }
  ]
})

export default router