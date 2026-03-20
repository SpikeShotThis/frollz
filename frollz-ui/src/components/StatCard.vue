<template>
  <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
    <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{{ label }}</h2>
    <p class="text-3xl font-bold" :class="colorClass">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: number
  colorClass: string
}>()
</script>
