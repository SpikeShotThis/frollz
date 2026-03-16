<template>
  <nav class="bg-white shadow-lg">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold text-primary-600">Frollz</h1>
          <span class="text-gray-500">Film Roll Tracker</span>
        </div>
        
        <div class="flex space-x-6">
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
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.nav-link {
  @apply px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-primary-600 hover:bg-gray-100 transition-colors duration-200;
}

.nav-link.active {
  @apply text-primary-600 bg-primary-50;
}
</style>