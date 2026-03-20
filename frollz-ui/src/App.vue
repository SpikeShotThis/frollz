<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Skip navigation — visually hidden until focused (WCAG 2.4.1 Bypass Blocks) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:font-medium focus:shadow-lg"
    >Skip to main content</a>
    <header>
      <NavBar />
    </header>
    <main id="main-content" tabindex="-1" class="max-w-screen-xl mx-auto page-x py-8 focus:outline-none">
      <RouterView />
    </main>
    <footer class="py-4 text-center text-sm text-gray-600 dark:text-gray-500">
      <p>Frollz &mdash; Film Roll Tracker</p>
    </footer>
    <AppAnnouncer />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AppAnnouncer from '@/components/AppAnnouncer.vue'
import { useThemeStore } from '@/stores/theme'

useThemeStore()
</script>
