<script setup lang="ts">
import { computed, ref } from 'vue';
import { Screen } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { type ThemePreference, useTheme } from '../composables/useTheme.js';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const leftDrawerOpen = ref(false);
const { themePreference, themeOptions, activeThemeLabel, setThemePreference } = useTheme();

const primaryLinks = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  {
    label: 'Film',
    to: '/film',
    icon: 'camera_roll',
    children: [
      { label: 'All Film', to: '/film' },
      { label: '35mm', to: '/film/35mm' },
      { label: 'Medium Format', to: '/film/medium-format' },
      { label: 'Large Format 4x5', to: '/film/large-format-4x5' },
      { label: 'Large Format 8x10', to: '/film/large-format-8x10' }
    ]
  },
  {
    label: 'Devices',
    to: '/devices',
    icon: 'photo_camera',
    children: [
      { label: 'All Devices', to: '/devices' },
      { label: 'Cameras', to: '/devices/cameras' },
      { label: 'Film Holders', to: '/devices/film-holders' },
      { label: 'Interchangeable Backs', to: '/devices/interchangeable-backs' }
    ]
  },
  {
    label: 'Emulsions',
    to: '/emulsions',
    icon: 'water_drop',
    children: [
      { label: 'All Emulsions', to: '/emulsions' },
      { label: 'Black & White', to: '/emulsions/black-and-white' },
      { label: 'B&W Reversal', to: '/emulsions/black-and-white-reversal' },
      { label: 'Cine (ECN-2)', to: '/emulsions/cine-ecn2' },
      { label: 'Color Negative (C-41)', to: '/emulsions/color-negative-c41' },
      { label: 'Color Positive (E-6)', to: '/emulsions/color-positive-e6' }
    ]
  },
  { label: 'Style Guide', to: '/style-guide', icon: 'palette' }
] as const;

const pageTitle = computed(() => String(route.meta.title ?? 'frollz'));

async function logout(): Promise<void> {
  await authStore.logout();
  await router.replace('/login');
}

function closeDrawerOnNavigate(): void {
  // Keep the drawer open on desktop and collapse it only on mobile/tablet navigation.
  if (Screen.lt.md) {
    leftDrawerOpen.value = false;
  }
}

function selectTheme(preference: ThemePreference): void {
  setThemePreference(preference);
}
</script>

<template>
  <q-layout view="hHh Lpr lFf" class="app-shell-layout">
    <q-header class="app-shell-header">
      <q-toolbar>
        <q-btn flat round dense icon="menu" aria-label="Menu" @click="leftDrawerOpen = !leftDrawerOpen" />
        <q-toolbar-title>{{ pageTitle }}</q-toolbar-title>
        <div class="row items-center q-gutter-sm">
          <q-btn flat round dense icon="contrast" aria-label="Select theme">
            <q-tooltip>Theme: {{ activeThemeLabel }}</q-tooltip>
            <q-menu auto-close>
              <q-list dense style="min-width: 180px;">
                <q-item v-for="option in themeOptions" :key="option.value" clickable @click="selectTheme(option.value)">
                  <q-item-section avatar>
                    <q-icon :name="option.value === themePreference ? 'check' : option.icon" />
                  </q-item-section>
                  <q-item-section>{{ option.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-chip v-if="authStore.user" dense>{{ authStore.user.email }}</q-chip>
          <q-btn flat color="negative" label="Logout" @click="logout" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :width="280" class="app-shell-drawer">
      <q-list padding>
        <q-item class="q-px-none">
          <q-item-section>
            <q-item-label header>Navigation</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round icon="close" aria-label="Close" @click="leftDrawerOpen = false" />
          </q-item-section>
        </q-item>

        <template v-for="link in primaryLinks" :key="link.to">
          <q-expansion-item v-if="'children' in link && link.children" dense dense-toggle expand-separator
            :icon="link.icon" :label="link.label">
            <q-list class="q-pl-lg q-pb-xs">
              <q-item v-for="child in link.children" :key="child.to" dense clickable :to="child.to"
                @click="closeDrawerOnNavigate">
                <q-item-section>{{ child.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <q-item v-else clickable :to="link.to" exact @click="closeDrawerOnNavigate">
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>{{ link.label }}</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <main id="app-main-content">
        <RouterView />
      </main>
    </q-page-container>
  </q-layout>
</template>
