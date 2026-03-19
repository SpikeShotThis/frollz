<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <NavBar />
    <main class="max-w-screen-xl mx-auto page-x py-8">
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
