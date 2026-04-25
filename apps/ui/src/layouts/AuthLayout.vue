<script setup lang="ts">
import { type ThemePreference, useTheme } from '../composables/useTheme.js';

const { themePreference, themeOptions, activeThemeLabel, setThemePreference } = useTheme();

function selectTheme(preference: ThemePreference): void {
  setThemePreference(preference);
}
</script>

<template>
  <q-layout view="hHh lpR fFf" class="auth-shell-layout">
    <div class="auth-theme-control">
      <q-btn flat round dense icon="contrast" aria-label="Select theme">
        <q-tooltip>Theme: {{ activeThemeLabel }}</q-tooltip>
        <q-menu auto-close>
          <q-list dense style="min-width: 180px;">
            <q-item
              v-for="option in themeOptions"
              :key="option.value"
              clickable
              @click="selectTheme(option.value)"
            >
              <q-item-section avatar>
                <q-icon :name="option.value === themePreference ? 'check' : option.icon" />
              </q-item-section>
              <q-item-section>{{ option.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <q-page-container>
      <main id="auth-main-content">
        <RouterView />
      </main>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.auth-theme-control {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2400;
}
</style>
