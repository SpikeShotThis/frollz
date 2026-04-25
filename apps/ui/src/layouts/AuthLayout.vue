<script setup lang="ts">
import { type ThemePreference, useTheme } from '../composables/useTheme.js';

const { themePreference, themeOptions, activeThemeLabel, setThemePreference } = useTheme();
</script>

<template>
  <q-layout view="hHh lpR fFf" class="auth-shell-layout">
    <q-page-sticky position="top-right" :offset="[12, 12]">
      <q-btn flat round dense icon="contrast" aria-label="Select theme">
        <q-tooltip>Theme: {{ activeThemeLabel }}</q-tooltip>
        <q-menu auto-close>
          <q-list dense>
            <q-item
              v-for="option in themeOptions"
              :key="option.value"
              clickable
              @click="setThemePreference(option.value as ThemePreference)"
            >
              <q-item-section avatar>
                <q-icon :name="option.value === themePreference ? 'check' : option.icon" />
              </q-item-section>
              <q-item-section>{{ option.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-page-sticky>
    <q-page-container>
      <main id="auth-main-content">
        <RouterView />
      </main>
    </q-page-container>
  </q-layout>
</template>
