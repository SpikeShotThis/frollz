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
        path: 'film/35mm',
        component: () => import('../pages/FilmPage.vue'),
        meta: {
          layout: 'app',
          title: '35mm',
          showInNav: true,
          order: 1,
          navParent: '/film',
          navKey: '/film/35mm',
          filmFormatFilters: ['35mm']
        }
      },
      {
        path: 'film/medium-format',
        component: () => import('../pages/FilmPage.vue'),
        meta: {
          layout: 'app',
          title: 'Medium Format',
          showInNav: true,
          order: 2,
          navParent: '/film',
          navKey: '/film/medium-format',
          filmFormatFilters: ['120', '220']
        }
      },
      {
        path: 'film/large-format-4x5',
        component: () => import('../pages/FilmPage.vue'),
        meta: {
          layout: 'app',
          title: 'Large Format (4x5)',
          showInNav: true,
          order: 3,
          navParent: '/film',
          navKey: '/film/large-format-4x5',
          filmFormatFilters: ['4x5']
        }
      },
      {
        path: 'film/large-format-8x10',
        component: () => import('../pages/FilmPage.vue'),
        meta: {
          layout: 'app',
          title: 'Large Format (8x10)',
          showInNav: true,
          order: 4,
          navParent: '/film',
          navKey: '/film/large-format-8x10',
          filmFormatFilters: ['8x10']
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
        path: 'devices/cameras',
        component: () => import('../pages/DevicesPage.vue'),
        meta: {
          layout: 'app',
          title: 'Cameras',
          showInNav: true,
          order: 1,
          navParent: '/devices',
          navKey: '/devices/cameras',
          deviceTypeFilter: 'camera'
        }
      },
      {
        path: 'devices/film-holders',
        component: () => import('../pages/DevicesPage.vue'),
        meta: {
          layout: 'app',
          title: 'Film Holders',
          showInNav: true,
          order: 2,
          navParent: '/devices',
          navKey: '/devices/film-holders',
          deviceTypeFilter: 'film_holder'
        }
      },
      {
        path: 'devices/interchangeable-backs',
        component: () => import('../pages/DevicesPage.vue'),
        meta: {
          layout: 'app',
          title: 'Interchangeable Backs',
          showInNav: true,
          order: 3,
          navParent: '/devices',
          navKey: '/devices/interchangeable-backs',
          deviceTypeFilter: 'interchangeable_back'
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
      },
      {
        path: 'emulsions/black-and-white',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: {
          layout: 'app',
          title: 'Black and White',
          showInNav: true,
          order: 1,
          navParent: '/emulsions',
          navKey: '/emulsions/black-and-white',
          developmentProcessFilter: 'BW'
        }
      },
      {
        path: 'emulsions/black-and-white-reversal',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: {
          layout: 'app',
          title: 'Black and White Reversal',
          showInNav: true,
          order: 2,
          navParent: '/emulsions',
          navKey: '/emulsions/black-and-white-reversal',
          developmentProcessFilter: 'BWReversal'
        }
      },
      {
        path: 'emulsions/cine-ecn2',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: {
          layout: 'app',
          title: 'Cine (ECN-2)',
          showInNav: true,
          order: 3,
          navParent: '/emulsions',
          navKey: '/emulsions/cine-ecn2',
          developmentProcessFilter: 'ECN2'
        }
      },
      {
        path: 'emulsions/color-negative-c41',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: {
          layout: 'app',
          title: 'Color Negative (C-41)',
          showInNav: true,
          order: 4,
          navParent: '/emulsions',
          navKey: '/emulsions/color-negative-c41',
          developmentProcessFilter: 'C41'
        }
      },
      {
        path: 'emulsions/color-positive-e6',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: {
          layout: 'app',
          title: 'Color Positive (E-6)',
          showInNav: true,
          order: 5,
          navParent: '/emulsions',
          navKey: '/emulsions/color-positive-e6',
          developmentProcessFilter: 'E6'
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
