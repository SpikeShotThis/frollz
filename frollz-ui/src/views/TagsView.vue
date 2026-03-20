<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Tags</h1>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3">
      <p v-if="tags.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500 italic">No tags found.</p>
      <div
        v-for="tag in paginatedTags"
        :key="tag._key"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
      >
        <!-- View mode -->
        <template v-if="editingKey !== tag._key">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="shrink-0 inline-block w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600"
                :style="{ backgroundColor: tag.color }"
              ></span>
              <span
                class="px-2 py-1 rounded text-sm font-medium text-white truncate"
                :style="{ backgroundColor: tag.color }"
              >{{ tag.value }}</span>
            </div>
            <div class="flex gap-2 shrink-0">
              <button
                @click="startEdit(tag)"
                class="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
              >Edit</button>
              <button
                @click="confirmDelete(tag)"
                class="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
              >Delete</button>
            </div>
          </div>
          <div class="flex gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>Roll scope: {{ tag.isRollScoped ? 'Yes' : 'No' }}</span>
            <span>Stock scope: {{ tag.isStockScoped ? 'Yes' : 'No' }}</span>
            <span>{{ formatDate(tag.createdAt) }}</span>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="space-y-3">
            <div class="flex gap-3 items-center">
              <input v-model="editForm.color" type="color" aria-label="Color" class="h-10 w-16 rounded cursor-pointer border border-gray-300 dark:border-gray-600" />
              <input
                v-model="editForm.value"
                type="text"
                aria-label="Value"
                class="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div class="flex gap-6 text-sm">
              <label :for="'mobile-roll-scope-' + tag._key" class="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                <input :id="'mobile-roll-scope-' + tag._key" v-model="editForm.isRollScoped" type="checkbox" class="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded" />
                Roll scope
              </label>
              <label :for="'mobile-stock-scope-' + tag._key" class="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                <input :id="'mobile-stock-scope-' + tag._key" v-model="editForm.isStockScoped" type="checkbox" class="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded" />
                Stock scope
              </label>
            </div>
            <div class="flex gap-2">
              <button
                @click="saveEdit(tag._key!)"
                class="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
              >Save</button>
              <button
                @click="cancelEdit"
                class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >Cancel</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Color</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roll Scope</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Scope</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="tag in paginatedTags" :key="tag._key">
              <td class="px-6 py-4 whitespace-nowrap">
                <template v-if="editingKey === tag._key">
                  <input
                    v-model="editForm.color"
                    type="color"
                    aria-label="Color"
                    class="h-8 w-16 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                  />
                </template>
                <template v-else>
                  <span
                    class="inline-block w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
                    :style="{ backgroundColor: tag.color }"
                  ></span>
                </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <template v-if="editingKey === tag._key">
                  <input
                    v-model="editForm.value"
                    type="text"
                    aria-label="Value"
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </template>
                <template v-else>
                  <span
                    class="px-2 py-1 rounded text-xs font-medium text-white"
                    :style="{ backgroundColor: tag.color }"
                  >{{ tag.value }}</span>
                </template>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  aria-label="Roll scope"
                  :checked="editingKey === tag._key ? editForm.isRollScoped : tag.isRollScoped"
                  :disabled="editingKey !== tag._key"
                  @change="editingKey === tag._key && (editForm.isRollScoped = ($event.target as HTMLInputElement).checked)"
                  class="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  aria-label="Stock scope"
                  :checked="editingKey === tag._key ? editForm.isStockScoped : tag.isStockScoped"
                  :disabled="editingKey !== tag._key"
                  @change="editingKey === tag._key && (editForm.isStockScoped = ($event.target as HTMLInputElement).checked)"
                  class="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                    class="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >Cancel</button>
                </template>
                <template v-else>
                  <button
                    @click="startEdit(tag)"
                    class="px-3 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                  >Edit</button>
                  <button
                    @click="confirmDelete(tag)"
                    class="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                  >Delete</button>
                </template>
              </td>
            </tr>
            <tr v-if="tags.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No tags found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between px-2 py-3 mt-3">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <div class="flex gap-2">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
        >Previous</button>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
        >Next</button>
      </div>
    </div>

    <!-- Stock Scope Removal Warning Modal -->
    <BaseModal :open="!!scopeChangeWarning" title-id="scope-change-title" @close="cancelScopeChange">
      <h2 id="scope-change-title" class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Remove Stock Scope</h2>
      <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">
        This tag is currently assigned to
        <span class="font-semibold">{{ scopeChangeWarning?.count }}</span>
        stock{{ scopeChangeWarning?.count === 1 ? '' : 's' }}.
        Removing the stock scope will remove this tag from all of them.
      </p>
      <div class="flex justify-end gap-3">
        <button
          @click="cancelScopeChange"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >Cancel</button>
        <button
          @click="confirmScopeChange"
          class="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
        >Confirm</button>
      </div>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal :open="!!deleteTarget" title-id="delete-tag-title" @close="deleteTarget = null">
      <h2 id="delete-tag-title" class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Delete Tag</h2>
      <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
        Are you sure you want to delete the tag
        <span class="font-semibold">{{ deleteTarget?.value }}</span>?
      </p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">
        This tag has
        <span class="font-semibold">{{ deleteStockTagCount }}</span>
        stock association{{ deleteStockTagCount === 1 ? '' : 's' }}.
        All associations will be removed.
      </p>
      <div class="flex justify-end gap-3">
        <button
          @click="deleteTarget = null"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >Cancel</button>
        <button
          @click="executeDelete"
          class="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
        >Delete</button>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tagApi, stockTagApi } from '@/services/api-client'
import type { Tag } from '@/types'
import BaseModal from '@/components/BaseModal.vue'

const PAGE_SIZE = 10

const tags = ref<Tag[]>([])
const currentPage = ref(1)

const editingKey = ref<string | null>(null)
const editForm = ref({ value: '', color: '#000000', isRollScoped: true, isStockScoped: true })

const deleteTarget = ref<Tag | null>(null)
const deleteStockTagCount = ref(0)

const scopeChangeWarning = ref<{ tagKey: string; count: number } | null>(null)

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
  } catch (err) {
    console.error('Error loading tags:', err)
  }
}

const startEdit = (tag: Tag) => {
  editingKey.value = tag._key!
  editForm.value = {
    value: tag.value,
    color: tag.color,
    isRollScoped: tag.isRollScoped ?? true,
    isStockScoped: tag.isStockScoped ?? true,
  }
}

const cancelEdit = () => {
  editingKey.value = null
}

const saveEdit = async (key: string) => {
  const original = tags.value.find(t => t._key === key)
  if (original?.isStockScoped && !editForm.value.isStockScoped) {
    try {
      const response = await stockTagApi.getAll({ tagKey: key })
      scopeChangeWarning.value = { tagKey: key, count: response.data.length }
    } catch (err) {
      console.error('Error fetching stock-tag count:', err)
    }
    return
  }
  try {
    await tagApi.update(key, {
      value: editForm.value.value,
      color: editForm.value.color,
      isRollScoped: editForm.value.isRollScoped,
      isStockScoped: editForm.value.isStockScoped,
    })
    editingKey.value = null
    await loadTags()
  } catch (err) {
    console.error('Error saving tag:', err)
  }
}

const confirmScopeChange = async () => {
  if (!scopeChangeWarning.value) return
  const key = scopeChangeWarning.value.tagKey
  try {
    await tagApi.update(key, {
      value: editForm.value.value,
      color: editForm.value.color,
      isRollScoped: editForm.value.isRollScoped,
      isStockScoped: editForm.value.isStockScoped,
    })
    const response = await stockTagApi.getAll({ tagKey: key })
    await Promise.all(response.data.map(st => stockTagApi.delete(st._key!)))
    scopeChangeWarning.value = null
    editingKey.value = null
    await loadTags()
  } catch (err) {
    console.error('Error saving tag with scope change:', err)
  }
}

const cancelScopeChange = () => {
  editForm.value.isStockScoped = true
  scopeChangeWarning.value = null
}

const confirmDelete = async (tag: Tag) => {
  try {
    const response = await stockTagApi.getAll({ tagKey: tag._key })
    deleteStockTagCount.value = response.data.length
    deleteTarget.value = tag
  } catch (err) {
    console.error('Error fetching stock-tag count:', err)
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
  } catch (err) {
    console.error('Error deleting tag:', err)
  }
}

onMounted(loadTags)
</script>
