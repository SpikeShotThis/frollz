<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Films</h1>
      <div class="flex flex-wrap gap-2">
        <button
          @click="exportFilmsJson"
          :disabled="exportingJson"
          class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-2 min-h-[44px] rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium disabled:opacity-50"
        >
          {{ exportingJson ? 'Exporting…' : 'Export JSON' }}
        </button>
        <button
          @click="exportLibraryJson"
          :disabled="exportingLibrary"
          class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-2 min-h-[44px] rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium disabled:opacity-50"
        >
          {{ exportingLibrary ? 'Exporting…' : 'Export Library' }}
        </button>
        <button
          @click="csvInput?.click()"
          :disabled="importingCsv"
          class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-2 min-h-[44px] rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium disabled:opacity-50"
        >
          {{ importingCsv ? 'Importing…' : 'Import CSV' }}
        </button>
        <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden" aria-label="Select CSV file to import" @change="onCsvSelected" />
        <button @click="openAddFilm()" class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium">
          Add Film
        </button>
      </div>
    </div>

    <!-- Import results -->
    <div v-if="importResult" class="mb-4 rounded-md border p-4 text-sm" :class="importResult.errors.length ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700' : 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium text-gray-800 dark:text-gray-200">
          Import complete — {{ importResult.imported }} imported, {{ importResult.skipped }} skipped
        </span>
        <button @click="importResult = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
      </div>
      <ul v-if="importResult.errors.length" class="mt-2 space-y-1 text-yellow-800 dark:text-yellow-200">
        <li v-for="err in importResult.errors" :key="err.row">Row {{ err.row }}: {{ err.reason }}</li>
      </ul>
      <p v-if="!importResult.errors.length" class="text-green-800 dark:text-green-200 mt-1">
        All rows imported successfully. <a :href="importApi.templateUrl" class="underline">Download template</a> for next time.
      </p>
    </div>

    <!-- Search + Filters toggle row -->
    <div class="flex gap-3 mb-3">
      <!-- Search -->
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by name or note…"
          aria-label="Search films"
          class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <!-- Filters toggle -->
      <button
        @click="showFilters = !showFilters"
        :aria-expanded="showFilters"
        aria-controls="filter-panel"
        class="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] border rounded-md text-sm font-medium transition-colors"
        :class="showFilters || hasActiveFilters
          ? 'bg-primary-50 dark:bg-primary-900/40 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-300'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M7 8h10M11 12h2" />
        </svg>
        Filters
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary-600 text-white"
        >{{ activeFilterCount }}</span>
        <svg
          class="w-3 h-3 transition-transform"
          :class="showFilters ? 'rotate-180' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Collapsible filter panel -->
    <div
      v-show="showFilters"
      id="filter-panel"
      class="mb-3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
    >
      <!-- State -->
      <div class="mb-4">
        <div class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">State</div>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="state in filmStateOptions"
            :key="state"
            :for="`state-filter-${state}`"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-sm transition-colors"
            :class="selectedStates.includes(state)
              ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 dark:border-primary-400 text-primary-800 dark:text-primary-200'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'"
          >
            <input :id="`state-filter-${state}`" type="checkbox" :value="state" v-model="selectedStates" class="sr-only" />
            {{ state }}
          </label>
        </div>
      </div>

      <!-- Emulsion / Format -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="filter-emulsion" class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Emulsion
            <select
              id="filter-emulsion"
              v-model="selectedEmulsionId"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal"
            >
              <option :value="null">All emulsions</option>
              <option v-for="emulsion in sortedEmulsions" :key="emulsion.id" :value="emulsion.id">
                {{ emulsion.brand }} — {{ emulsion.name }}
              </option>
            </select>
          </label>
        </div>
        <div>
          <label for="filter-format" class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Format
            <select
              id="filter-format"
              v-model="selectedFormatId"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal"
            >
              <option :value="null">All formats</option>
              <option v-for="format in formats" :key="format.id" :value="format.id">{{ format.name }}</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Tags (full-width, scrollable) -->
      <div class="mb-4" v-if="tags.length > 0">
        <div class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Tags</div>
        <div class="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
          <label
            v-for="tag in tags"
            :key="tag.id"
            :for="`tag-filter-${tag.id}`"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-sm transition-colors"
            :class="selectedTagIds.includes(tag.id)
              ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 dark:border-primary-400 text-primary-800 dark:text-primary-200'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'"
          >
            <input :id="`tag-filter-${tag.id}`" type="checkbox" :value="tag.id" v-model="selectedTagIds" class="sr-only" />
            <span class="inline-block w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: tag.colorCode }"></span>
            {{ tag.name }}
          </label>
        </div>
      </div>

      <!-- Loaded date range -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="filter-from" class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Loaded from
            <input id="filter-from" v-model="selectedFrom" type="date"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal" />
          </label>
        </div>
        <div>
          <label for="filter-to" class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Loaded to
            <input id="filter-to" v-model="selectedTo" type="date"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal" />
          </label>
        </div>
      </div>
      <p v-if="dateRangeError" role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ dateRangeError }}</p>
    </div>

    <!-- Active filter chips -->
    <div v-if="activeFilterChips.length > 0" class="flex flex-wrap items-center gap-2 mb-4">
      <button
        v-for="chip in activeFilterChips"
        :key="chip.key"
        @click="chip.remove()"
        class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 border border-primary-300 dark:border-primary-600 text-primary-800 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
      >
        {{ chip.label }}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ filteredFilms.length }} film(s)</span>
      <button @click="clearAllFilters" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-1">
        Clear all
      </button>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3" :aria-busy="isLoading" aria-label="Films list">
      <!-- Skeleton -->
      <template v-if="isLoading">
        <div v-for="n in 5" :key="n" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 shrink-0"></div>
          </div>
        </div>
      </template>
      <template v-else>
        <p v-if="filteredFilms.length === 0" class="text-center py-8 text-gray-600 dark:text-gray-400 italic">No films found.</p>
        <RouterLink
          v-for="film in filteredFilms"
          :key="film.id"
          :to="{ name: 'film-detail', params: { key: film.id } }"
          class="block bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-primary-600 dark:text-primary-400 truncate">{{ film.name }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">{{ film.emulsion?.brand ?? '—' }}</p>
            </div>
            <div class="shrink-0 flex items-center gap-2">
              <!-- Scan link indicator -->
              <template v-if="getScanUrls(film).length > 0">
                <a
                  v-if="getScanUrls(film).length === 1"
                  :href="getScanUrls(film)[0]"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`1 scan link`"
                  data-testid="scan-indicator"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                  @click.stop
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ getScanUrls(film).length }}
                </a>
                <span
                  v-else
                  :aria-label="`${getScanUrls(film).length} scan links`"
                  data-testid="scan-indicator"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ getScanUrls(film).length }}
                </span>
              </template>
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(getStateName(film))"
              >{{ getStateName(film) || 'No state' }}</span>
            </div>
          </div>
        </RouterLink>
      </template>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md" :aria-busy="isLoading" aria-label="Films table">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">Emulsion</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">State</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">Scans</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <!-- Skeleton -->
            <template v-if="isLoading">
              <tr v-for="n in 5" :key="n" class="animate-pulse">
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div></td>
                <td class="px-6 py-4"><div class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div></td>
                <td class="px-6 py-4"></td>
                <td class="px-6 py-4"></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredFilms.length === 0">
                <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-400 italic">No films found.</td>
              </tr>
              <tr v-for="film in filteredFilms" :key="film.id" v-memo="[film, film.states]">
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline"
                  @click="$router.push({ name: 'film-detail', params: { key: film.id } })"
                >{{ film.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ film.emulsion?.brand ?? '—' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="getStateColor(getStateName(film))"
                  >{{ getStateName(film) || 'No state' }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <template v-if="getScanUrls(film).length > 0">
                    <a
                      v-if="getScanUrls(film).length === 1"
                      :href="getScanUrls(film)[0]"
                      target="_blank"
                      rel="noopener noreferrer"
                      :aria-label="`1 scan link`"
                      data-testid="scan-indicator"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {{ getScanUrls(film).length }}
                    </a>
                    <RouterLink
                      v-else
                      :to="{ name: 'film-detail', params: { key: film.id } }"
                      :aria-label="`${getScanUrls(film).length} scan links`"
                      data-testid="scan-indicator"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {{ getScanUrls(film).length }}
                    </RouterLink>
                  </template>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    @click="$router.push({ name: 'film-detail', params: { key: film.id } })"
                    class="px-3 py-2 min-h-[44px] text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                  >View</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Film Modal -->
    <BaseModal :open="showModal" title-id="add-film-title" @close="closeModal">
        <h2 id="add-film-title" class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Film</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label for="film-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span class="text-red-500" aria-hidden="true">*</span>
                <input
                  id="film-name"
                  v-model="form.name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="e.g. Roll 001"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </label>
            </div>

            <!-- Bulk film toggle -->
            <div class="flex items-center gap-3">
              <label for="film-bulk-canister" class="flex items-center gap-2 cursor-pointer">
                <input id="film-bulk-canister" v-model="form.isBulkFilm" type="checkbox" class="rounded" @change="onBulkFilmToggle" />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Bulk canister</span>
              </label>
              <span class="text-xs text-gray-600 dark:text-gray-400">(100ft spool or similar)</span>
            </div>

            <!-- Parent bulk film selector -->
            <div v-if="!form.isBulkFilm">
              <label for="film-parent" class="block text-sm font-medium text-gray-700 dark:text-gray-300">From bulk canister — optional
                <select
                  id="film-parent"
                  v-model="form.parentId"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  @change="onParentFilmChange"
                >
                  <option value="">None — standalone</option>
                  <option v-for="film in bulkFilms" :key="film.id" :value="film.id">
                    {{ film.name }} — {{ film.emulsion?.brand ?? 'Unknown emulsion' }}
                  </option>
                </select>
              </label>
            </div>

            <!-- Emulsion selector: hidden when parent is selected -->
            <div v-if="!form.parentId">
              <label for="film-emulsion" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Emulsion <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="film-emulsion"
                  v-model="form.emulsionId"
                  :required="!form.parentId"
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select an emulsion</option>
                  <option v-for="emulsion in sortedEmulsions" :key="emulsion.id" :value="emulsion.id">
                    {{ emulsion.brand }} — {{ emulsion.manufacturer }} (ISO {{ emulsion.speed }})
                  </option>
                </select>
              </label>
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
              Emulsion inherited from parent bulk canister
            </div>

            <div>
              <label for="film-expiration-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiration Date
                <input
                  id="film-expiration-date"
                  v-model="form.expirationDate"
                  type="date"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
            </div>

            <div>
              <label for="film-profile" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Transition Profile <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="film-profile"
                  v-model="form.transitionProfileId"
                  required
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select a profile</option>
                  <option v-for="profile in transitionProfiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option>
                </select>
              </label>
            </div>
          </div>
          <div v-if="error" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {{ submitting ? 'Adding...' : 'Add Film' }}
            </button>
          </div>
        </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { filmApi, emulsionApi, transitionApi, formatApi, tagApi, exportApi, importApi } from '@/services/api-client'
import BaseModal from '@/components/BaseModal.vue'
import type { Film, Emulsion, TransitionProfile, Format, Tag } from '@/types'
import { currentStateName, getScanUrls } from '@/types'
import { getStateColor } from '@/utils/stateColors'
import { triggerDownload } from '@/utils/download'

const route = useRoute()
const router = useRouter()

const films = ref<Film[]>([])
const emulsions = ref<Emulsion[]>([])
const formats = ref<Format[]>([])
const tags = ref<Tag[]>([])
const transitionProfiles = ref<TransitionProfile[]>([])
const isLoading = ref(true)
const exportingJson = ref(false)
const exportingLibrary = ref(false)
const importingCsv = ref(false)
const csvInput = ref<HTMLInputElement | null>(null)
const importResult = ref<{ imported: number; skipped: number; errors: { row: number; reason: string }[] } | null>(null)
const showModal = ref(false)

const searchQuery = ref('')
const showFilters = ref(false)

const selectedStates = ref<string[]>([])
const selectedEmulsionId = ref<number | null>(null)
const selectedFormatId = ref<number | null>(null)
const selectedTagIds = ref<number[]>([])
const selectedFrom = ref<string>('')
const selectedTo = ref<string>('')

const submitting = ref(false)
const error = ref('')

// State names come from transition graph; use a static list for the filter UI
const filmStateOptions = [
  'Added', 'Frozen', 'Refrigerated', 'Shelved', 'Loaded',
  'Finished', 'Sent For Development', 'Developed', 'Received',
]

const dateRangeError = computed(() => {
  if (selectedFrom.value && selectedTo.value && selectedFrom.value > selectedTo.value) {
    return '"Loaded from" must be on or before "Loaded to".'
  }
  return ''
})

type FilterChip = { key: string; label: string; remove: () => void }

const activeFilterChips = computed((): FilterChip[] => {
  const chips: FilterChip[] = []
  selectedStates.value.forEach(state => {
    chips.push({ key: `state-${state}`, label: state, remove: () => { selectedStates.value = selectedStates.value.filter(s => s !== state) } })
  })
  if (selectedEmulsionId.value !== null) {
    const e = emulsions.value.find(x => x.id === selectedEmulsionId.value)
    if (e) chips.push({ key: 'emulsion', label: `${e.brand} — ${e.name}`, remove: () => { selectedEmulsionId.value = null } })
  }
  if (selectedFormatId.value !== null) {
    const f = formats.value.find(x => x.id === selectedFormatId.value)
    if (f) chips.push({ key: 'format', label: f.name, remove: () => { selectedFormatId.value = null } })
  }
  selectedTagIds.value.forEach(tagId => {
    const t = tags.value.find(x => x.id === tagId)
    if (t) chips.push({ key: `tag-${tagId}`, label: t.name, remove: () => { selectedTagIds.value = selectedTagIds.value.filter(id => id !== tagId) } })
  })
  if (selectedFrom.value) chips.push({ key: 'from', label: `From ${selectedFrom.value}`, remove: () => { selectedFrom.value = '' } })
  if (selectedTo.value) chips.push({ key: 'to', label: `To ${selectedTo.value}`, remove: () => { selectedTo.value = '' } })
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim()
    chips.push({ key: 'search', label: `"${q}"`, remove: () => { searchQuery.value = '' } })
  }
  return chips
})

const activeFilterCount = computed(() => activeFilterChips.value.length)

const hasActiveFilters = computed(() => activeFilterChips.value.length > 0)

const clearAllFilters = () => {
  selectedStates.value = []
  selectedEmulsionId.value = null
  selectedFormatId.value = null
  selectedTagIds.value = []
  selectedFrom.value = ''
  selectedTo.value = ''
  searchQuery.value = ''
}

const getStateName = (film: Film): string => currentStateName(film)

const emptyForm = () => ({
  name: '',
  emulsionId: '',
  expirationDate: '',
  transitionProfileId: '' as string | number,
  isBulkFilm: false,
  parentId: '',
})

const form = ref(emptyForm())

const filteredFilms = computed(() => films.value)

const sortedEmulsions = computed(() =>
  emulsions.value.slice().sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()))
)

const bulkprofileId = computed(() =>
  transitionProfiles.value.find(p => p.name === 'bulk')?.id ?? '',
)

const bulkFilms = computed(() =>
  films.value.filter(f => f.transitionProfileId === bulkprofileId.value)
)

const onBulkFilmToggle = () => {
  if (form.value.isBulkFilm) {
    form.value.parentId = ''
    form.value.transitionProfileId = bulkprofileId.value
  } else {
    const standardId = transitionProfiles.value.find(p => p.name === 'standard')?.id ?? ''
    form.value.transitionProfileId = standardId
  }
}

const onParentFilmChange = () => {
  if (form.value.parentId) {
    form.value.emulsionId = ''
  }
}

const closeModal = () => {
  showModal.value = false
  form.value = emptyForm()
  error.value = ''
}

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const payload = {
      name: form.value.name,
      transitionProfileId: Number(form.value.transitionProfileId),
      ...(form.value.emulsionId ? { emulsionId: form.value.emulsionId } : {}),
      ...(form.value.expirationDate ? { expirationDate: form.value.expirationDate } : {}),
      ...(form.value.parentId ? { parentId: form.value.parentId } : {}),
    }
    const created = await filmApi.create(payload)
    closeModal()
    await router.push({ name: 'film-detail', params: { key: created.data.id } })
  } catch {
    error.value = 'Failed to add film. Please try again.'
  } finally {
    submitting.value = false
  }
}

const loadFilms = async () => {
  if (dateRangeError.value) return
  isLoading.value = true
  try {
    const params: Parameters<typeof filmApi.getAll>[0] = {}
    if (selectedStates.value.length > 0) params.state = selectedStates.value
    if (selectedEmulsionId.value !== null) params.emulsionId = selectedEmulsionId.value
    if (selectedFormatId.value !== null) params.formatId = selectedFormatId.value
    if (selectedTagIds.value.length > 0) params.tagId = selectedTagIds.value
    if (selectedFrom.value) params.from = selectedFrom.value
    if (selectedTo.value) params.to = selectedTo.value
    if (searchQuery.value.trim()) params.q = searchQuery.value.trim()
    const response = await filmApi.getAll(Object.keys(params).length > 0 ? params : undefined)
    films.value = response.data
  } catch (err) {
    console.error('Error loading films:', err)
  } finally {
    isLoading.value = false
  }
}

const updateUrlQueryParams = () => {
  const query: Record<string, string | string[]> = {}
  if (selectedStates.value.length > 0) query.state = selectedStates.value
  if (selectedEmulsionId.value !== null) query.emulsionId = String(selectedEmulsionId.value)
  if (selectedFormatId.value !== null) query.formatId = String(selectedFormatId.value)
  if (selectedTagIds.value.length > 0) query.tagId = selectedTagIds.value.map(String)
  if (selectedFrom.value) query.from = selectedFrom.value
  if (selectedTo.value) query.to = selectedTo.value
  if (searchQuery.value.trim()) query.q = searchQuery.value.trim()
  router.replace({ query })
}

watch([selectedStates, selectedEmulsionId, selectedFormatId, selectedTagIds, selectedFrom, selectedTo], () => {
  loadFilms()
  updateUrlQueryParams()
}, { deep: true })

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchDebounceTimer !== null) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    loadFilms()
    updateUrlQueryParams()
  }, 300)
})

const exportFilmsJson = async () => {
  exportingJson.value = true
  try {
    await triggerDownload(exportApi.filmsJsonPath, 'films.json')
  } catch (err) {
    console.error('Export failed:', err)
  } finally {
    exportingJson.value = false
  }
}

const exportLibraryJson = async () => {
  exportingLibrary.value = true
  try {
    await triggerDownload(exportApi.libraryJsonPath, 'library.json')
  } catch (err) {
    console.error('Export failed:', err)
  } finally {
    exportingLibrary.value = false
  }
}

const onCsvSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importingCsv.value = true
  importResult.value = null
  try {
    const res = await importApi.importFilms(file)
    importResult.value = res.data
    await loadFilms()
  } catch (err) {
    console.error('Import failed:', err)
  } finally {
    importingCsv.value = false
    if (csvInput.value) csvInput.value.value = ''
  }
}

const openAddFilm = (emulsionId?: string) => {
  if (emulsionId) form.value.emulsionId = emulsionId
  // Default to standard profile
  const standardId = transitionProfiles.value.find(p => p.name === 'standard')?.id ?? ''
  form.value.transitionProfileId = standardId
  showModal.value = true
}

onMounted(async () => {
  const stateParam = route.query.state
  if (stateParam) {
    const states = Array.isArray(stateParam) ? stateParam : [stateParam]
    selectedStates.value = states.filter((s): s is string => s !== null)
  }
  const emulsionIdParam = route.query.emulsionId
  if (emulsionIdParam && typeof emulsionIdParam === 'string') {
    selectedEmulsionId.value = parseInt(emulsionIdParam, 10) || null
  }
  const formatIdParam = route.query.formatId
  if (formatIdParam && typeof formatIdParam === 'string') {
    selectedFormatId.value = parseInt(formatIdParam, 10) || null
  }
  const tagIdParam = route.query.tagId
  if (tagIdParam) {
    const ids = Array.isArray(tagIdParam) ? tagIdParam : [tagIdParam]
    selectedTagIds.value = ids.map(Number).filter(Boolean)
  }
  const fromParam = route.query.from
  if (fromParam && typeof fromParam === 'string') selectedFrom.value = fromParam
  const toParam = route.query.to
  if (toParam && typeof toParam === 'string') selectedTo.value = toParam
  const qParam = route.query.q
  if (qParam && typeof qParam === 'string') searchQuery.value = qParam

  await Promise.all([
    loadFilms(),
    emulsionApi.getAll().then(r => { emulsions.value = r.data }),
    formatApi.getAll().then(r => { formats.value = r.data }),
    tagApi.getAll().then(r => { tags.value = r.data }),
    transitionApi.getProfiles().then(r => { transitionProfiles.value = r.data }),
  ])

  const openWithEmulsionId = route.query.emulsionId as string | undefined
  if (openWithEmulsionId && selectedEmulsionId.value === null) openAddFilm(openWithEmulsionId)
})
</script>
