<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Total Rolls</h3>
        <p class="text-3xl font-bold text-primary-600">{{ stats.totalRolls }}</p>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Available Stocks</h3>
        <p class="text-3xl font-bold text-green-600">{{ stats.totalStocks }}</p>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Currently Loaded</h3>
        <p class="text-3xl font-bold text-yellow-600">{{ stats.loadedRolls }}</p>
      </div>
      
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Developed</h3>
        <p class="text-3xl font-bold text-blue-600">{{ stats.developedRolls }}</p>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Recent Rolls</h2>
        <div class="space-y-4">
          <div v-for="roll in recentRolls" :key="roll._key" class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <div>
              <p class="font-medium">{{ roll.rollId }}</p>
              <p class="text-sm text-gray-500">{{ roll.state }}</p>
            </div>
            <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
              {{ formatDate(roll.dateObtained) }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div class="space-y-4">
          <RouterLink 
            to="/rolls?action=create" 
            class="block w-full bg-primary-600 text-white text-center py-3 px-4 rounded-md hover:bg-primary-700 font-medium"
          >
            Add New Roll
          </RouterLink>
          <RouterLink 
            to="/stocks?action=create" 
            class="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-md hover:bg-green-700 font-medium"
          >
            Add New Stock
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
import type { Roll } from '@/types'

const stats = ref({
  totalRolls: 0,
  totalStocks: 0,
  loadedRolls: 0,
  developedRolls: 0,
})

const recentRolls = ref<Roll[]>([])

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const loadStats = async () => {
  try {
    const [rollsResponse, stocksResponse] = await Promise.all([
      rollApi.getAll(),
      stockApi.getAll()
    ])
    
    const rolls = rollsResponse.data
    stats.value.totalRolls = rolls.length
    stats.value.totalStocks = stocksResponse.data.length
    stats.value.loadedRolls = rolls.filter(r => r.state === 'Loaded').length
    stats.value.developedRolls = rolls.filter(r => r.state === 'Developed').length
    
    // Get recent rolls (last 5)
    recentRolls.value = rolls
      .sort((a, b) => new Date(b.dateObtained).getTime() - new Date(a.dateObtained).getTime())
      .slice(0, 5)
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>