<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Dashboard</h1>

    <!-- Stat cards -->
    <section
      aria-label="Dashboard statistics"
      :aria-busy="loading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
    >
      <template v-if="loading">
        <div v-for="n in 4" :key="n" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-pulse">
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
          <div class="h-9 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </template>
      <template v-else>
        <StatCard label="Total Rolls" :value="stats.totalRolls" colorClass="text-primary-600 dark:text-primary-400" />
        <StatCard label="Available Stocks" :value="stats.totalStocks" colorClass="text-green-600 dark:text-green-400" />
        <StatCard label="Currently Loaded" :value="stats.loadedRolls" colorClass="text-yellow-700 dark:text-yellow-400" />
        <StatCard label="Developed" :value="stats.developedRolls" colorClass="text-blue-600 dark:text-blue-400" />
      </template>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" :aria-busy="loading">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Rolls</h2>

        <!-- Skeleton -->
        <div v-if="loading" class="space-y-4" aria-hidden="true">
          <div v-for="n in 5" :key="n" class="animate-pulse flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
          </div>
        </div>

        <!-- Error state -->
        <p v-else-if="hasError" class="py-4 text-sm text-red-600 dark:text-red-400">
          Could not load dashboard data. Please refresh to try again.
        </p>

        <!-- Empty state -->
        <div v-else-if="recentRolls.length === 0" class="py-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">No rolls yet.</p>
          <RouterLink
            to="/rolls?action=create"
            class="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium text-sm"
          >
            Add your first roll
          </RouterLink>
        </div>

        <!-- Roll list -->
        <div v-else class="space-y-4">
          <div v-for="roll in recentRolls" :key="roll._key" class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <div>
              <p class="font-medium">{{ roll.rollId }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ roll.state }}</p>
            </div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
          </div>
        </div>

        <!-- Error state -->
        <p v-else-if="hasError" class="py-4 text-sm text-red-600 dark:text-red-400">
          Could not load dashboard data. Please refresh to try again.
        </p>

        <!-- Empty state -->
        <div v-else-if="recentFilms.length === 0" class="py-8 text-center">
          <p class="text-gray-500 dark:text-gray-400 mb-4">No films yet.</p>
          <RouterLink
            to="/films?action=create"
            class="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium text-sm"
          >
            Add your first film
          </RouterLink>
        </div>

        <!-- Film list -->
        <div v-else class="space-y-4">
          <div v-for="film in recentFilms" :key="film.id" class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <div>
              <p class="font-medium">{{ film.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ getStateName(film) }}</p>
            </div>
            <span v-if="getStateDate(film)" class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-xs">
              {{ formatDate(getStateDate(film)!) }}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h2>
        <div class="space-y-4">
          <RouterLink
            to="/films?action=create"
            class="block w-full bg-primary-600 text-white text-center py-3 px-4 rounded-md hover:bg-primary-700 font-medium"
          >
            Add New Film
          </RouterLink>
          <RouterLink
            to="/emulsions?action=create"
            class="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-md hover:bg-green-700 font-medium"
          >
            Add New Emulsion
          </RouterLink>
          <RouterLink
            to="/formats?action=create"
            class="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            Add Film Format
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { rollApi, stockApi } from '@/services/api-client'
import { RollState } from '@/types'
import type { Roll } from '@/types'
import StatCard from '@/components/StatCard.vue'

const loading = ref(true)
const hasError = ref(false)

const stats = ref({
  totalFilms: 0,
  totalEmulsions: 0,
  loadedFilms: 0,
  developedFilms: 0,
})

const recentFilms = ref<Film[]>([])

const formatDate = (date: Date | string) => new Date(date as string).toLocaleDateString()

const getStateName = (film: Film): string => currentStateName(film)

const getStateDate = (film: Film): Date | null => {
  if (!film.states?.length) return null
  const sorted = [...film.states].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const date = sorted[0]?.date
  return date ? new Date(date) : null
}

const loadStats = async () => {
  try {
    const [filmsResponse, emulsionsResponse] = await Promise.all([
      filmApi.getAll(),
      emulsionApi.getAll(),
    ])

    const rolls = rollsResponse.data
    stats.value.totalRolls = rolls.length
    stats.value.totalStocks = stocksResponse.data.length
    stats.value.loadedRolls = rolls.filter(r => r.state === RollState.LOADED).length
    stats.value.developedRolls = rolls.filter(
      r => r.state === RollState.DEVELOPED || r.state === RollState.RECEIVED
    ).length

    recentRolls.value = [...rolls]
      .sort((a, b) => new Date(b.dateObtained).getTime() - new Date(a.dateObtained).getTime())
      .slice(0, 5)
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
    hasError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>
