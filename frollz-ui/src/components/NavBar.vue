<template>
  <nav class="bg-white dark:bg-gray-800 shadow-lg">
    <div class="max-w-screen-xl mx-auto page-x">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center space-x-4">
          <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">Frollz</span>
          <span class="text-gray-500 dark:text-gray-400">Film Roll Tracker</span>
        </div>

        <div class="flex items-center space-x-6">
          <RouterLink
            to="/"
            class="nav-link"
            :class="{ 'active': $route.name === 'dashboard' }"
          >
            Dashboard
          </RouterLink>
          <RouterLink
            to="/formats"
            class="nav-link"
            :class="{ 'active': $route.name === 'formats' }"
          >
            Film Formats
          </RouterLink>
          <RouterLink
            to="/stocks"
            class="nav-link"
            :class="{ 'active': $route.name === 'stocks' }"
          >
            Stocks
          </RouterLink>
          <RouterLink
            to="/rolls"
            class="nav-link"
            :class="{ 'active': $route.name === 'rolls' }"
          >
            Rolls
          </RouterLink>
          <RouterLink
            to="/tags"
            class="nav-link"
            :class="{ 'active': $route.name === 'tags' }"
          >
            Tags
          </RouterLink>

          <button
            @click="themeStore.toggle()"
            class="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <SunIcon v-if="themeStore.isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<style scoped>
@reference "../style.css";

.nav-link {
  @apply px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-primary-600 hover:bg-gray-100 transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-gray-700;
}

.nav-link.active {
  @apply text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-gray-700;
}
</style>
