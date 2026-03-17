<template>
  <div>
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Tags</h1>
    </div>

    <div class="bg-white rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="tag in paginatedTags" :key="tag._key">
              <td class="px-6 py-4 whitespace-nowrap">
                <template v-if="editingKey === tag._key">
                  <input
                    v-model="editForm.color"
                    type="color"
                    class="h-8 w-16 rounded cursor-pointer border border-gray-300"
                  />
                </template>
                <template v-else>
                  <span
                    class="inline-block w-6 h-6 rounded-full border border-gray-200"
                    :style="{ backgroundColor: tag.color }"
                  ></span>
                </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <template v-if="editingKey === tag._key">
                  <input
                    v-model="editForm.value"
                    type="text"
                    class="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </template>
                <template v-else>
                  <span
                    class="px-2 py-1 rounded text-xs font-medium text-white"
                    :style="{ backgroundColor: tag.color }"
                  >{{ tag.value }}</span>
                </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(tag.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                <template v-if="editingKey === tag._key">
                  <button
                    @click="saveEdit(tag._key!)"
                    class="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >Save</button>
                  <button
                    @click="cancelEdit"
                    class="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  >Cancel</button>
                </template>
                <template v-else>
                  <button
                    @click="startEdit(tag)"
                    class="px-3 py-1 text-xs font-medium text-primary-600 border border-primary-300 rounded hover:bg-primary-50"
                  >Edit</button>
                  <button
                    @click="confirmDelete(tag)"
                    class="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >Delete</button>
                </template>
              </td>
            </tr>
            <tr v-if="tags.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400">No tags found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-3 border-t border-gray-200">
        <span class="text-sm text-gray-500">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <div class="flex gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >Previous</button>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >Next</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-bold text-gray-900 mb-3">Delete Tag</h2>
        <p class="text-sm text-gray-700 mb-2">
          Are you sure you want to delete the tag
          <span class="font-semibold">{{ deleteTarget.value }}</span>?
        </p>
        <p class="text-sm text-gray-700 mb-6">
          This tag has
          <span class="font-semibold">{{ deleteStockTagCount }}</span>
          stock association{{ deleteStockTagCount === 1 ? '' : 's' }}.
          All associations will be removed.
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="deleteTarget = null"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >Cancel</button>
          <button
            @click="executeDelete"
            class="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tagApi, stockTagApi } from '@/services/api-client'
import type { Tag } from '@/types'

const PAGE_SIZE = 10

const tags = ref<Tag[]>([])
const currentPage = ref(1)

const editingKey = ref<string | null>(null)
const editForm = ref({ value: '', color: '#000000' })

const deleteTarget = ref<Tag | null>(null)
const deleteStockTagCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(tags.value.length / PAGE_SIZE)))

const paginatedTags = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return tags.value.slice(start, start + PAGE_SIZE)
})

const formatDate = (date?: Date) => date ? new Date(date).toLocaleDateString() : '-'

const loadTags = async () => {
  try {
    const response = await tagApi.getAll()
    tags.value = response.data
  } catch (e) {
    console.error('Error loading tags:', e)
  }
}

const startEdit = (tag: Tag) => {
  editingKey.value = tag._key!
  editForm.value = { value: tag.value, color: tag.color }
}

const cancelEdit = () => {
  editingKey.value = null
}

const saveEdit = async (key: string) => {
  try {
    await tagApi.update(key, { value: editForm.value.value, color: editForm.value.color })
    editingKey.value = null
    await loadTags()
  } catch (e) {
    console.error('Error saving tag:', e)
  }
}

const confirmDelete = async (tag: Tag) => {
  try {
    const response = await stockTagApi.getAll({ tagKey: tag._key })
    deleteStockTagCount.value = response.data.length
    deleteTarget.value = tag
  } catch (e) {
    console.error('Error fetching stock-tag count:', e)
  }
}

const executeDelete = async () => {
  if (!deleteTarget.value) return
  const tag = deleteTarget.value
  try {
    const response = await stockTagApi.getAll({ tagKey: tag._key })
    await Promise.all(response.data.map(st => stockTagApi.delete(st._key!)))
    await tagApi.delete(tag._key!)
    deleteTarget.value = null
    await loadTags()
  } catch (e) {
    console.error('Error deleting tag:', e)
  }
}

onMounted(loadTags)
</script>
