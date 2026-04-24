import { route } from 'quasar/wrappers';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { pinia } from '../stores/pinia.js';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppShellLayout.vue'),
    meta: { layout: 'app' },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('../pages/DashboardPage.vue'), meta: { title: 'Dashboard', layout: 'app' } },
      { path: 'film', component: () => import('../pages/FilmPage.vue'), meta: { title: 'Film', layout: 'app' } },
      {
        path: 'film/35mm',
        component: () => import('../pages/FilmPage.vue'),
        meta: { title: '35mm', layout: 'app', filmFormatFilters: ['35mm'] }
      },
      {
        path: 'film/medium-format',
        component: () => import('../pages/FilmPage.vue'),
        meta: { title: 'Medium Format', layout: 'app', filmFormatFilters: ['120'] }
      },
      {
        path: 'film/large-format-4x5',
        component: () => import('../pages/FilmPage.vue'),
        meta: { title: 'Large Format 4x5', layout: 'app', filmFormatFilters: ['4x5'] }
      },
      {
        path: 'film/large-format-8x10',
        component: () => import('../pages/FilmPage.vue'),
        meta: { title: 'Large Format 8x10', layout: 'app', filmFormatFilters: ['8x10'] }
      },
      { path: 'film/:id', component: () => import('../pages/FilmDetailPage.vue'), meta: { title: 'Film Detail', layout: 'app' } },
      { path: 'devices', component: () => import('../pages/DevicesPage.vue'), meta: { title: 'Devices', layout: 'app' } },
      {
        path: 'devices/cameras',
        component: () => import('../pages/DevicesPage.vue'),
        meta: { title: 'Cameras', layout: 'app', deviceTypeFilter: 'camera' }
      },
      {
        path: 'devices/film-holders',
        component: () => import('../pages/DevicesPage.vue'),
        meta: { title: 'Film Holders', layout: 'app', deviceTypeFilter: 'film_holder' }
      },
      {
        path: 'devices/interchangeable-backs',
        component: () => import('../pages/DevicesPage.vue'),
        meta: { title: 'Interchangeable Backs', layout: 'app', deviceTypeFilter: 'interchangeable_back' }
      },
      {
        path: 'devices/:id',
        component: () => import('../pages/DeviceDetailPage.vue'),
        meta: { title: 'Device Detail', layout: 'app' }
      },
      { path: 'emulsions', component: () => import('../pages/EmulsionsPage.vue'), meta: { title: 'Emulsions', layout: 'app' } },
      {
        path: 'emulsions/black-and-white',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: { title: 'Black and White', layout: 'app', developmentProcessFilter: 'BW' }
      },
      {
        path: 'emulsions/black-and-white-reversal',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: { title: 'Black and White Reversal', layout: 'app', developmentProcessFilter: 'BWReversal' }
      },
      {
        path: 'emulsions/cine-ecn2',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: { title: 'Cine (ECN-2)', layout: 'app', developmentProcessFilter: 'ECN2' }
      },
      {
        path: 'emulsions/color-negative-c41',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: { title: 'Color Negative (C-41)', layout: 'app', developmentProcessFilter: 'C41' }
      },
      {
        path: 'emulsions/color-positive-e6',
        component: () => import('../pages/EmulsionsPage.vue'),
        meta: { title: 'Color Positive (E-6)', layout: 'app', developmentProcessFilter: 'E6' }
      },
      {
        path: 'emulsions/:id',
        component: () => import('../pages/EmulsionDetailPage.vue'),
        meta: { title: 'Emulsion Detail', layout: 'app' }
      },
      {
        path: 'style-guide',
        component: () => import('../pages/StyleGuidePage.vue'),
        meta: { title: 'Style Guide', layout: 'app' }
      }
    ]
  },
  {
    path: '/',
    component: () => import('../layouts/AuthLayout.vue'),
    meta: { layout: 'auth' },
    children: [
      { path: 'login', component: () => import('../pages/LoginPage.vue'), meta: { public: true, layout: 'auth', title: 'Sign in' } },
      {
        path: 'register',
        component: () => import('../pages/RegisterPage.vue'),
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
