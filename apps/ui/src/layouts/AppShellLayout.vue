<script setup lang="ts">
import { computed, ref } from 'vue';
import { Screen } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { type ThemePreference, useTheme } from '../composables/useTheme.js';
import { useAuthStore } from '../stores/auth.js';
import { useNavigation } from '../composables/useNavigation.js';
import type { NavItem } from '../composables/useNavigation.js';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const drawerOpen = ref(Screen.gt.sm);
const drawerMini = ref(Screen.gt.sm);
const expandedNavGroups = ref<Record<string, boolean>>({});
const { themePreference, themeOptions, activeThemeLabel, setThemePreference } = useTheme();

// Auto-generated navigation from route metadata
const { navigationTree } = useNavigation();

const isDesktop = computed(() => Screen.gt.sm);
const pageTitle = computed(() => String(route.meta.title ?? 'frollz'));

async function logout(): Promise<void> {
  await authStore.logout();
  await router.replace('/login');
}

function closeDrawerOnNavigate(): void {
  if (!isDesktop.value) {
    drawerOpen.value = false;
  }
}

function isNavGroupExpanded(link: NavItem): boolean {
  const explicitState = expandedNavGroups.value[link.to];
  if (typeof explicitState === 'boolean') {
    return explicitState;
  }
  return route.path === link.to || route.path.startsWith(`${link.to}/`);
}

async function navigateOnGroupToggle(link: NavItem, expanded: boolean): Promise<void> {
  expandedNavGroups.value[link.to] = expanded;

  if (route.path !== link.to) {
    await router.push(link.to);
  }

  closeDrawerOnNavigate();
}

function toggleDesktopDrawerSize(): void {
  drawerMini.value = !drawerMini.value;
  drawerOpen.value = true;
}
</script>

<template>
  <q-layout view="hHh Lpr lFf" class="app-shell-layout">
    <q-header class="app-shell-header">
      <q-toolbar>
        <q-btn v-if="!isDesktop" flat round dense icon="menu" aria-label="Menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title>{{ pageTitle }}</q-toolbar-title>
        <div class="row items-center q-gutter-sm">
          <q-btn flat round dense icon="contrast" aria-label="Select theme">
            <q-tooltip>Theme: {{ activeThemeLabel }}</q-tooltip>
            <q-menu auto-close>
              <q-list dense>
                <q-item v-for="option in themeOptions" :key="option.value" clickable
                  @click="setThemePreference(option.value as ThemePreference)">
                  <q-item-section avatar>
                    <q-icon :name="option.value === themePreference ? 'check' : option.icon" />
                  </q-item-section>
                  <q-item-section>{{ option.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" side="left" show-if-above bordered :width="280" :mini-width="48"
      :mini="isDesktop ? drawerMini : false" class="app-shell-drawer">
      <div class="column full-height no-wrap">
        <q-list padding class="col">
          <q-item class="q-px-none">
            <q-item-section>
              <q-item-label header class="q-mini-drawer-hide">Navigation</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn v-if="isDesktop" flat dense round :icon="drawerMini ? 'chevron_right' : 'chevron_left'"
                aria-label="Toggle drawer size" @click="toggleDesktopDrawerSize" />
              <q-btn v-else flat dense round icon="close" aria-label="Close" @click="drawerOpen = false" />
            </q-item-section>
          </q-item>

          <template v-for="link in navigationTree" :key="link.to">
            <q-item v-if="isDesktop && drawerMini" clickable :to="link.to" exact @click="closeDrawerOnNavigate">
              <q-item-section avatar>
                <q-icon :name="link.icon" />
              </q-item-section>
              <q-tooltip anchor="center left" self="center right">{{ link.label }}</q-tooltip>
            </q-item>

            <q-expansion-item v-else-if="link.children && link.children.length > 0" dense dense-toggle expand-separator
              :icon="link.icon" :label="link.label" :model-value="isNavGroupExpanded(link)"
              @update:model-value="(value: boolean) => navigateOnGroupToggle(link, value)">
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

        <q-separator />

        <q-list class="q-pa-sm">
          <q-item v-if="authStore.user" dense class="q-mini-drawer-hide">
            <q-item-section>
              <q-item-label caption>Signed in as</q-item-label>
              <q-item-label lines="1">{{ authStore.user.email }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable dense @click="logout">
            <q-item-section avatar>
              <q-icon name="logout" color="negative" />
            </q-item-section>
            <q-item-section class="text-negative q-mini-drawer-hide">Logout</q-item-section>
            <q-tooltip v-if="isDesktop && drawerMini" anchor="center left" self="center right">Logout</q-tooltip>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <q-page-container>
      <main id="app-main-content">
        <RouterView />
      </main>
    </q-page-container>
  </q-layout>
</template>
