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
const leftDrawerOpen = ref(false);
const expandedNavGroups = ref<Record<string, boolean>>({});
const { themePreference, themeOptions, activeThemeLabel, setThemePreference } = useTheme();

// Auto-generated navigation from route metadata
const { navigationTree } = useNavigation();

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

        <template v-for="link in navigationTree" :key="link.to">
          <q-expansion-item v-if="link.children && link.children.length > 0" dense dense-toggle expand-separator
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
    </q-drawer>

    <q-page-container>
      <main id="app-main-content">
        <RouterView />
      </main>
    </q-page-container>
  </q-layout>
</template>
