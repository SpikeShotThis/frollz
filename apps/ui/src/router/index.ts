import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppShellLayout.vue'),
    meta: { layout: 'app' },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        component: () => import('../pages/DashboardPage.vue'),
        meta: {
          layout: 'app',
          title: 'Dashboard',
          icon: 'dashboard',
          order: 1,
          showInNav: true
        }
      },
      {
        path: 'film',
        component: () => import('../pages/FilmPage.vue'),
        meta: {
          layout: 'app',
          title: 'Film',
          icon: 'film',
          order: 2,
          showInNav: true
        }
      },
      {
        path: 'film/:id',
        component: () => import('../pages/FilmDetailPage.vue'),
        meta: {
          layout: 'app',
          title: 'Film Detail',
          navKey: '/film'
        }
      },
      {
        path: 'devices',
        component: () => import('../pages/DevicesPage.vue'),
        meta: {
          layout: 'app',
          title: 'Devices',
          icon: 'devices',
          order: 3,
          showInNav: true
        }
      },
      {
        path: 'emulsions',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: {
          layout: 'app',
          title: 'Emulsions',
          icon: 'emulsions',
          order: 4,
          showInNav: true
        }
      }
    ]
  },
  {
    path: '/',
    component: () => import('../layouts/AuthLayout.vue'),
    meta: { layout: 'auth' },
    children: [
      {
        path: 'login',
        component: () => import('../pages/LoginPage.vue'),
        meta: { public: true, layout: 'auth', title: 'Sign in' }
      },
      {
        path: 'register',
        component: () => import('../pages/RegisterPage.vue'),
        meta: { public: true, layout: 'auth', title: 'Create account' }
      }
    ]
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!authStore.isSessionInitialized) {
    await authStore.restoreSession();
  }

  if (!to.meta.public && !authStore.isAuthenticated) {
    return '/login';
  }

  if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    return '/dashboard';
  }

  return true;
});
