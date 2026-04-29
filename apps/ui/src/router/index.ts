import { route } from 'quasar/wrappers';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { pinia } from '../stores/pinia.js';

// File-based routing structure - manually defined routes that mirror pages/ directory
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppShellLayout.vue'),
    children: [
      // Root redirect
      {
        path: '',
        component: () => import('../pages/index.vue'),
        meta: { layout: 'app' }
      },

      // Dashboard
      {
        path: 'dashboard',
        component: () => import('../pages/dashboard.vue'),
        meta: { layout: 'app', title: 'Dashboard', icon: 'dashboard', showInNav: true, order: 0 }
      },

      // Film routes
      {
        path: 'film',
        component: () => import('../pages/film/index.vue'),
        meta: { layout: 'app', title: 'Film', icon: 'camera_roll', showInNav: true, order: 1 }
      },
      {
        path: 'film/35mm',
        component: () => import('../pages/film/35mm.vue'),
        meta: {
          layout: 'app',
          title: '35mm',
          icon: 'camera_roll',
          showInNav: true,
          navParent: 'film',
          order: 1,
          filmFormatFilters: ['35mm']
        }
      },
      {
        path: 'film/medium-format',
        component: () => import('../pages/film/medium-format.vue'),
        meta: {
          layout: 'app',
          title: 'Medium Format',
          icon: 'camera_roll',
          showInNav: true,
          navParent: 'film',
          order: 2,
          filmFormatFilters: ['120']
        }
      },
      {
        path: 'film/large-format',
        component: () => import('../pages/film/large-format.vue'),
        meta: {
          layout: 'app',
          title: 'Large Format',
          icon: 'camera_roll',
          showInNav: true,
          navParent: 'film',
          order: 3,
          filmFormatFilters: ['4x5', '5x7', '8x10', '11x14']
        }
      },
      {
        path: 'film/instant',
        component: () => import('../pages/film/instant.vue'),
        meta: {
          layout: 'app',
          title: 'Instant Film',
          icon: 'camera_roll',
          showInNav: true,
          navParent: 'film',
          order: 4,
          filmFormatFilters: ['InstaxMini', 'InstaxWide', 'InstaxSquare']
        }
      },
      {
        path: 'film/:id',
        component: () => import('../pages/film/[id].vue'),
        meta: { layout: 'app', title: 'Film Detail' }
      },

      // Devices routes
      {
        path: 'devices',
        component: () => import('../pages/devices/index.vue'),
        meta: { layout: 'app', title: 'Devices', icon: 'photo_camera', showInNav: true, order: 2 }
      },
      {
        path: 'devices/cameras',
        component: () => import('../pages/devices/cameras.vue'),
        meta: {
          layout: 'app',
          title: 'Cameras',
          icon: 'photo_camera',
          showInNav: true,
          navParent: 'devices',
          order: 1,
          deviceTypeFilter: 'camera'
        }
      },
      {
        path: 'devices/film-holders',
        component: () => import('../pages/devices/film-holders.vue'),
        meta: {
          layout: 'app',
          title: 'Film Holders',
          icon: 'photo_camera',
          showInNav: true,
          navParent: 'devices',
          order: 2,
          deviceTypeFilter: 'film_holder'
        }
      },
      {
        path: 'devices/interchangeable-backs',
        component: () => import('../pages/devices/interchangeable-backs.vue'),
        meta: {
          layout: 'app',
          title: 'Interchangeable Backs',
          icon: 'photo_camera',
          showInNav: true,
          navParent: 'devices',
          order: 3,
          deviceTypeFilter: 'interchangeable_back'
        }
      },
      {
        path: 'devices/:id',
        component: () => import('../pages/devices/[id].vue'),
        meta: { layout: 'app', title: 'Device Detail' }
      },

      // Emulsions routes
      {
        path: 'emulsions',
        component: () => import('../pages/emulsions/index.vue'),
        meta: { layout: 'app', title: 'Emulsions', icon: 'water_drop', showInNav: true, order: 3 }
      },
      {
        path: 'emulsions/black-and-white',
        component: () => import('../pages/emulsions/black-and-white.vue'),
        meta: {
          layout: 'app',
          title: 'Black & White',
          icon: 'water_drop',
          showInNav: true,
          navParent: 'emulsions',
          order: 1,
          developmentProcessFilter: 'BW'
        }
      },
      {
        path: 'emulsions/black-and-white-reversal',
        component: () => import('../pages/emulsions/black-and-white-reversal.vue'),
        meta: {
          layout: 'app',
          title: 'B&W Reversal',
          icon: 'water_drop',
          showInNav: true,
          navParent: 'emulsions',
          order: 2,
          developmentProcessFilter: 'BWReversal'
        }
      },
      {
        path: 'emulsions/cine-ecn2',
        component: () => import('../pages/emulsions/cine-ecn2.vue'),
        meta: {
          layout: 'app',
          title: 'Cine (ECN-2)',
          icon: 'water_drop',
          showInNav: true,
          navParent: 'emulsions',
          order: 3,
          developmentProcessFilter: 'ECN2'
        }
      },
      {
        path: 'emulsions/color-negative-c41',
        component: () => import('../pages/emulsions/color-negative-c41.vue'),
        meta: {
          layout: 'app',
          title: 'Color Negative (C-41)',
          icon: 'water_drop',
          showInNav: true,
          navParent: 'emulsions',
          order: 4,
          developmentProcessFilter: 'C41'
        }
      },
      {
        path: 'emulsions/color-positive-e6',
        component: () => import('../pages/emulsions/color-positive-e6.vue'),
        meta: {
          layout: 'app',
          title: 'Color Positive (E-6)',
          icon: 'water_drop',
          showInNav: true,
          navParent: 'emulsions',
          order: 5,
          developmentProcessFilter: 'E6'
        }
      },
      {
        path: 'emulsions/instant',
        component: () => import('../pages/emulsions/instant.vue'),
        meta: {
          layout: 'app',
          title: 'Instant',
          icon: 'water_drop',
          showInNav: true,
          navParent: 'emulsions',
          order: 5,
          developmentProcessFilter: 'Instant'
        }
      },
      {
        path: 'emulsions/:id',
        component: () => import('../pages/emulsions/[id].vue'),
        meta: { layout: 'app', title: 'Emulsion Detail' }
      },

      // Admin routes
      {
        path: 'admin',
        component: () => import('../pages/admin/index.vue'),
        meta: { layout: 'app', title: 'Admin', icon: 'settings', showInNav: true, order: 98 }
      },
      {
        path: 'admin/data-export',
        component: () => import('../pages/admin/data-export.vue'),
        meta: { layout: 'app', title: 'Data Export' }
      },

      // Style Guide
      {
        path: 'style-guide',
        component: () => import('../pages/style-guide.vue'),
        meta: { layout: 'app', title: 'Style Guide', icon: 'palette', showInNav: true, order: 99 }
      }
    ]
  },

  // Auth layout routes
  {
    path: '/',
    component: () => import('../layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        component: () => import('../pages/auth/login.vue'),
        meta: { public: true, layout: 'auth', title: 'Sign in' }
      },
      {
        path: 'register',
        component: () => import('../pages/auth/register.vue'),
        meta: { public: true, layout: 'auth', title: 'Create account' }
      }
    ]
  }
];

export let appRouter: ReturnType<typeof createRouter> | null = null;

export default route(() => {
  const router = createRouter({
    history: createWebHistory(),
    routes
  });

  router.beforeEach(async (to) => {
    const authStore = useAuthStore(pinia);

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

  appRouter = router;
  return router;
});
