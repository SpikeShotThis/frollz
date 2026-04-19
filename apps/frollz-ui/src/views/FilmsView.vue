<template>
  <div>
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
    >
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Films</h1>
      <div class="flex flex-wrap gap-2">
        <button
          @click="openAddFilm()"
          class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
        >
          Add Film
        </button>
      </div>
    </div>

    <!-- Search + Filters toggle row -->
    <div class="flex gap-3 mb-3">
      <!-- Search -->
      <div class="relative flex-1">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
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
        :class="
          showFilters || hasActiveFilters
            ? 'bg-primary-50 dark:bg-primary-900/40 border-primary-400 dark:border-primary-500 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        "
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4h18M7 8h10M11 12h2"
          />
        </svg>
        Filters
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-primary-600 text-white"
          >{{ activeFilterCount }}</span
        >
        <svg
          class="w-3 h-3 transition-transform"
          :class="showFilters ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
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
      <fieldset class="mb-6">
        <legend
          class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300 mb-2"
        >
          State
        </legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="state in filmStateOptions"
            :key="state"
            :for="`state-filter-${state}`"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-sm transition-colors"
            :class="
              selectedStates.includes(state)
                ? `${getStateColor(state)} ${getStateBorderColor(state)}`
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            "
          >
            <input
              :id="`state-filter-${state}`"
              type="checkbox"
              :value="state"
              v-model="selectedStates"
              class="sr-only"
            />
            {{ state }}
          </label>
        </div>
      </fieldset>

      <!-- Emulsion / Format -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 border-t border-gray-700 pt-4">
        <div>
          <label
            for="filter-emulsion"
            class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
          >
            Emulsion
            <select
              id="filter-emulsion"
              v-model="selectedEmulsionId"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal"
            >
              <option :value="null">All emulsions</option>
              <option
                v-for="emulsion in sortedEmulsions"
                :key="emulsion.id"
                :value="emulsion.id"
              >
                {{ emulsion.brand }}
              </option>
            </select>
          </label>
        </div>
        <div>
          <label
            for="filter-format"
            class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
          >
            Format
            <select
              id="filter-format"
              v-model="selectedFormatId"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal"
            >
              <option :value="null">All formats</option>
              <option
                v-for="format in formats"
                :key="format.id"
                :value="format.id"
              >
                {{ format.name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- Tags (searchable multi-select) -->
      <fieldset class="mb-6 border-t border-gray-700 pt-4" v-if="tags.length > 0">
        <legend
          class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300 mb-2"
        >
          Tags
        </legend>
        <TagMultiSelect
          v-model="selectedTagIds"
          :available-tags="tags"
          placeholder="Search tags…"
        />
      </fieldset>

      <!-- Loaded date range -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
        <div>
          <label
            for="filter-from"
            class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
          >
            Loaded from
            <input
              id="filter-from"
              v-model="selectedFrom"
              type="date"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal"
            />
          </label>
        </div>
        <div>
          <label
            for="filter-to"
            class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
          >
            Loaded to
            <input
              id="filter-to"
              v-model="selectedTo"
              type="date"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-normal normal-case tracking-normal"
            />
          </label>
        </div>
      </div>
      <p
        v-if="dateRangeError"
        role="alert"
        class="mt-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ dateRangeError }}
      </p>
      <p class="mt-4 border-t border-gray-700 pt-3 text-sm text-gray-500 dark:text-gray-400">
        {{ filteredFilms.length }} result(s)
      </p>
    </div>

    <!-- Active filter chips -->
    <div
      v-if="activeFilterChips.length > 0"
      class="flex flex-wrap items-center gap-2 mb-4"
    >
      <button
        v-for="chip in activeFilterChips"
        :key="chip.key"
        @click="chip.remove()"
        class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 border border-primary-300 dark:border-primary-600 text-primary-800 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
      >
        {{ chip.label }}
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{{ filteredFilms.length }} film(s)</span
      >
      <button
        @click="clearAllFilters"
        class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-1"
      >
        Clear all
      </button>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div
      class="md:hidden space-y-3"
      :aria-busy="isLoading"
      aria-label="Films list"
    >
      <!-- Skeleton -->
      <template v-if="isLoading">
        <div
          v-for="n in 5"
          :key="n"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0 flex-1">
              <div
                class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"
              ></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div
              class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 shrink-0"
            ></div>
          </div>
        </div>
      </template>
      <template v-else>
        <p
          v-if="filteredFilms.length === 0"
          class="text-center py-8 text-gray-600 dark:text-gray-400 italic"
        >
          No films found.
        </p>
        <RouterLink
          v-for="film in filteredFilms"
          :key="film.id"
          :to="{ name: 'film-detail', params: { key: film.id } }"
          class="block bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0">
              <p
                class="font-semibold text-primary-600 dark:text-primary-400 truncate"
              >
                {{ film.name }}
              </p>
              <p
                class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate"
              >
                {{ film.emulsion?.brand ?? "—" }}
              </p>
              <p
                v-if="loadedCameraByFilmId.has(film.id)"
                class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate"
              >
                {{ loadedCameraByFilmId.get(film.id)!.brand }} {{ loadedCameraByFilmId.get(film.id)!.model }}
              </p>
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
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {{ getScanUrls(film).length }}
                </a>
                <span
                  v-else
                  :aria-label="`${getScanUrls(film).length} scan links`"
                  data-testid="scan-indicator"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {{ getScanUrls(film).length }}
                </span>
              </template>
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(getStateName(film))"
                >{{ getStateName(film) || "No state" }}</span
              >
            </div>
          </div>
        </RouterLink>
      </template>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div
      class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md"
      :aria-busy="isLoading"
      aria-label="Films table"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
              >
                Name
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
              >
                Emulsion
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
              >
                State
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider select-none"
              >
                Camera
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider select-none"
              >
                Scans
              </th>
            </tr>
          </thead>
          <tbody
            class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
          >
            <!-- Skeleton -->
            <template v-if="isLoading">
              <tr v-for="n in 5" :key="n" class="animate-pulse">
                <td class="px-6 py-4">
                  <div
                    class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"
                  ></div>
                </td>
                <td class="px-6 py-4">
                  <div
                    class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"
                  ></div>
                </td>
                <td class="px-6 py-4">
                  <div
                    class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20"
                  ></div>
                </td>
                <td class="px-6 py-4">
                  <div
                    class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"
                  ></div>
                </td>
                <td class="px-6 py-4"></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredFilms.length === 0">
                <td
                  colspan="5"
                  class="px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-400 italic"
                >
                  No films found.
                </td>
              </tr>
              <tr
                v-for="film in filteredFilms"
                :key="film.id"
                v-memo="[film, film.states, loadedCameraByFilmId.get(film.id)]"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <RouterLink
                    :to="{ name: 'film-detail', params: { key: film.id } }"
                    class="text-primary-600 dark:text-primary-400 hover:underline"
                  >{{ film.name }}</RouterLink>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ film.emulsion?.brand ?? "—" }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="getStateColor(getStateName(film))"
                    >{{ getStateName(film) || "No state" }}</span
                  >
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{
                    loadedCameraByFilmId.has(film.id)
                      ? `${loadedCameraByFilmId.get(film.id)!.brand} ${loadedCameraByFilmId.get(film.id)!.model}`
                      : "—"
                  }}
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
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
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
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {{ getScanUrls(film).length }}
                    </RouterLink>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Film Modal -->
    <BaseModal :open="showModal" title-id="add-film-title" @close="closeModal">
      <h2
        id="add-film-title"
        class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
      >
        Add Film
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <div>
            <label
              for="film-name"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Name <span class="text-red-500" aria-hidden="true">*</span>
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

          <!-- Create as bulk toggle: only for roll format emulsions -->
          <div v-if="selectedFormatIsRoll">
            <label
              for="film-create-as-bulk"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                id="film-create-as-bulk"
                v-model="form.isCreatingAsBulk"
                type="checkbox"
                class="rounded"
                @change="onCreateAsBulkChange"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Create as bulk canister</span
              >
            </label>
          </div>

          <!-- Parent bulk film selector: hidden for bulk canisters or when creating as bulk -->
          <div v-if="!selectedEmulsionIsBulk && !form.isCreatingAsBulk">
            <label
              for="film-parent"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >From bulk canister — optional
              <select
                id="film-parent"
                v-model="form.parentId"
                class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                @change="onParentFilmChange"
              >
                <option value="">None — standalone</option>
                <option
                  v-for="film in bulkFilms"
                  :key="film.id"
                  :value="film.id"
                >
                  {{ film.name }} —
                  {{ film.emulsion?.brand ?? "Unknown emulsion" }}
                </option>
              </select>
            </label>
          </div>

          <!-- Emulsion selector: hidden when parent is selected -->
          <div v-if="!form.parentId">
            <label
              for="film-emulsion"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Emulsion <span class="text-red-500" aria-hidden="true">*</span>
              <select
                id="film-emulsion"
                v-model="form.emulsionId"
                :required="!form.parentId"
                aria-required="true"
                class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                @change="onEmulsionChange"
              >
                <option value="" disabled>Select an emulsion</option>
                <option
                  v-for="emulsion in sortedEmulsions"
                  :key="emulsion.id"
                  :value="emulsion.id"
                >
                  {{ emulsion.brand }} — {{ emulsion.manufacturer }} (ISO
                  {{ emulsion.speed }})
                </option>
              </select>
            </label>
          </div>
          <div
            v-else
            class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2"
          >
            Emulsion inherited from parent bulk canister
          </div>

          <!-- Contextual note for bulk roll emulsions -->
          <div
            v-if="selectedEmulsionIsBulk"
            class="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-2 border border-blue-200 dark:border-blue-800"
          >
            This film will be a bulk canister — child rolls are cut from it
          </div>

          <div>
            <label
              for="film-expiration-date"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Expiration Date
              <input
                id="film-expiration-date"
                v-model="form.expirationDate"
                type="date"
                class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>
        </div>
        <div
          v-if="error"
          role="alert"
          class="mt-4 text-sm text-red-600 dark:text-red-400"
        >
          {{ error }}
        </div>
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
            {{ submitting ? "Adding..." : "Add Film" }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  filmApi,
  emulsionApi,
  transitionApi,
  formatApi,
  tagApi,
  cameraApi,
} from "@/services/api-client";
import BaseModal from "@/components/BaseModal.vue";
import TagMultiSelect from "@/components/TagMultiSelect.vue";
import type { Film, Emulsion, TransitionProfile, Format, Tag } from "@/types";
import type { Camera } from "@frollz/shared";
import { currentStateName, getScanUrls } from "@/types";
import { getStateColor, getStateBorderColor } from "@/utils/stateColors";

const route = useRoute();
const router = useRouter();

const films = ref<Film[]>([]);
const emulsions = ref<Emulsion[]>([]);
const formats = ref<Format[]>([]);
const tags = ref<Tag[]>([]);
const cameras = ref<Camera[]>([]);
const transitionProfiles = ref<TransitionProfile[]>([]);
const isLoading = ref(true);
const showModal = ref(false);

const searchQuery = ref("");
const showFilters = ref(false);

const selectedStates = ref<string[]>([]);
const selectedEmulsionId = ref<number | null>(null);
const selectedFormatId = ref<number | null>(null);
const selectedTagIds = ref<number[]>([]);
const selectedFrom = ref<string>("");
const selectedTo = ref<string>("");

const submitting = ref(false);
const error = ref("");

// State names come from transition graph; use a static list for the filter UI
const filmStateOptions = [
  "Added",
  "Frozen",
  "Refrigerated",
  "Shelved",
  "Loaded",
  "Finished",
  "Sent For Development",
  "Developed",
  "Received",
];

const dateRangeError = computed(() => {
  if (
    selectedFrom.value &&
    selectedTo.value &&
    selectedFrom.value > selectedTo.value
  ) {
    return '"Loaded from" must be on or before "Loaded to".';
  }
  return "";
});

type FilterChip = { key: string; label: string; remove: () => void };

const activeFilterChips = computed((): FilterChip[] => {
  const chips: FilterChip[] = [];
  selectedStates.value.forEach((state) => {
    chips.push({
      key: `state-${state}`,
      label: state,
      remove: () => {
        selectedStates.value = selectedStates.value.filter((s) => s !== state);
      },
    });
  });
  if (selectedEmulsionId.value !== null) {
    const e = emulsions.value.find((x) => x.id === selectedEmulsionId.value);
    if (e)
      chips.push({
        key: "emulsion",
        label: `${e.brand}`,
        remove: () => {
          selectedEmulsionId.value = null;
        },
      });
  }
  if (selectedFormatId.value !== null) {
    const f = formats.value.find((x) => x.id === selectedFormatId.value);
    if (f)
      chips.push({
        key: "format",
        label: f.name,
        remove: () => {
          selectedFormatId.value = null;
        },
      });
  }
  selectedTagIds.value.forEach((tagId) => {
    const t = tags.value.find((x) => x.id === tagId);
    if (t)
      chips.push({
        key: `tag-${tagId}`,
        label: t.name,
        remove: () => {
          selectedTagIds.value = selectedTagIds.value.filter(
            (id) => id !== tagId,
          );
        },
      });
  });
  if (selectedFrom.value)
    chips.push({
      key: "from",
      label: `From ${selectedFrom.value}`,
      remove: () => {
        selectedFrom.value = "";
      },
    });
  if (selectedTo.value)
    chips.push({
      key: "to",
      label: `To ${selectedTo.value}`,
      remove: () => {
        selectedTo.value = "";
      },
    });
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim();
    chips.push({
      key: "search",
      label: `"${q}"`,
      remove: () => {
        searchQuery.value = "";
      },
    });
  }
  return chips;
});

const activeFilterCount = computed(() => activeFilterChips.value.length);

const hasActiveFilters = computed(() => activeFilterChips.value.length > 0);

const clearAllFilters = () => {
  selectedStates.value = [];
  selectedEmulsionId.value = null;
  selectedFormatId.value = null;
  selectedTagIds.value = [];
  selectedFrom.value = "";
  selectedTo.value = "";
  searchQuery.value = "";
};

const getStateName = (film: Film): string => currentStateName(film);

function extractLoadedCameraId(film: Film): number | null {
  const loadedState = film.states.find((s) => s.state?.name === "Loaded");
  const meta = loadedState?.metadata.find(
    (m) => m.transitionStateMetadata?.field?.name === "cameraId",
  );
  const val = meta?.value;
  if (!val || Array.isArray(val)) return null;
  return parseInt(val, 10) || null;
}

const loadedCameraByFilmId = computed(() => {
  const map = new Map<number, Camera>();
  for (const film of films.value) {
    const cameraId = extractLoadedCameraId(film);
    if (cameraId === null) continue;
    const camera = cameras.value.find((c) => c.id === cameraId);
    if (camera) map.set(film.id, camera);
  }
  return map;
});

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyForm = () => ({
  name: "",
  emulsionId: "",
  expirationDate: getTodayString(),
  transitionProfileId: "" as string | number,
  parentId: "",
  isCreatingAsBulk: false,
});

const form = ref(emptyForm());

const filteredFilms = computed(() => films.value);

const sortedEmulsions = computed(() =>
  emulsions.value
    .slice()
    .sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase())),
);

const selectedEmulsion = computed(() => {
  if (!form.value.emulsionId) return null;
  return emulsions.value.find((e) => e.id === Number(form.value.emulsionId)) ?? null;
});

const selectedFormat = computed(() => {
  const emulsion = selectedEmulsion.value;
  if (!emulsion) return null;
  return formats.value.find((f) => f.id === emulsion.formatId) ?? null;
});

const selectedFormatIsRoll = computed(() => {
  const fmt = selectedFormat.value;
  if (!fmt) return false;
  return fmt.packageId === 2;
});

const selectedEmulsionIsBulk = computed(() => {
  const fmt = selectedFormat.value;
  if (!fmt) return false;
  return fmt.packageId === 3;
});

const bulkprofileId = computed(
  () => transitionProfiles.value.find((p) => p.name === "bulk")?.id ?? "",
);

const bulkFilms = computed(() =>
  films.value.filter((f) => f.transitionProfileId === bulkprofileId.value),
);

const onEmulsionChange = () => {
  const fmt = selectedFormat.value;
  if (!fmt) return;

  const packageId = fmt.packageId;
  let profileName = "standard";

  if (packageId === 3) {
    profileName = "bulk";
  } else if (packageId === 4) {
    profileName = "instant";
  }

  form.value.isCreatingAsBulk = false;
  setProfile(profileName);
};

const onCreateAsBulkChange = () => {
  const profileName = form.value.isCreatingAsBulk ? "bulk" : "standard";
  setProfile(profileName);
};

const setProfile = (profileName: string) => {
  const profile = transitionProfiles.value.find((p) => p.name === profileName);
  if (profile) {
    form.value.transitionProfileId = profile.id;
  }
};

const onParentFilmChange = () => {
  if (form.value.parentId) {
    form.value.emulsionId = "";
  }
};

const closeModal = () => {
  showModal.value = false;
  form.value = emptyForm();
  error.value = "";
};

const handleSubmit = async () => {
  submitting.value = true;
  error.value = "";
  try {
    const payload = {
      name: form.value.name,
      transitionProfileId: Number(form.value.transitionProfileId),
      ...(form.value.emulsionId
        ? { emulsionId: Number(form.value.emulsionId) }
        : {}),
      ...(form.value.expirationDate
        ? {
            expirationDate: new Date(
              `${form.value.expirationDate}T12:00:00`,
            ).toISOString(),
          }
        : {}),
      ...(form.value.parentId ? { parentId: Number(form.value.parentId) } : {}),
    };
    const created = await filmApi.create(payload);
    closeModal();
    await router.push({
      name: "film-detail",
      params: { key: created.data.id },
    });
  } catch {
    error.value = "Failed to add film. Please try again.";
  } finally {
    submitting.value = false;
  }
};

const loadFilms = async () => {
  if (dateRangeError.value) return;
  isLoading.value = true;
  try {
    const params: Parameters<typeof filmApi.getAll>[0] = {};
    if (selectedStates.value.length > 0) params.state = selectedStates.value;
    if (selectedEmulsionId.value !== null)
      params.emulsionId = selectedEmulsionId.value;
    if (selectedFormatId.value !== null)
      params.formatId = selectedFormatId.value;
    if (selectedTagIds.value.length > 0) params.tagId = selectedTagIds.value;
    if (selectedFrom.value) params.from = selectedFrom.value;
    if (selectedTo.value) params.to = selectedTo.value;
    if (searchQuery.value.trim()) params.q = searchQuery.value.trim();
    const response = await filmApi.getAll(
      Object.keys(params).length > 0 ? params : undefined,
    );
    films.value = response.data;
  } catch (err) {
    console.error("Error loading films:", err);
  } finally {
    isLoading.value = false;
  }
};

const updateUrlQueryParams = () => {
  const query: Record<string, string | string[]> = {};
  if (selectedStates.value.length > 0) query.state = selectedStates.value;
  if (selectedEmulsionId.value !== null)
    query.emulsionId = String(selectedEmulsionId.value);
  if (selectedFormatId.value !== null)
    query.formatId = String(selectedFormatId.value);
  if (selectedTagIds.value.length > 0)
    query.tagId = selectedTagIds.value.map(String);
  if (selectedFrom.value) query.from = selectedFrom.value;
  if (selectedTo.value) query.to = selectedTo.value;
  if (searchQuery.value.trim()) query.q = searchQuery.value.trim();
  router.replace({ query });
};

watch(
  [
    selectedStates,
    selectedEmulsionId,
    selectedFormatId,
    selectedTagIds,
    selectedFrom,
    selectedTo,
  ],
  () => {
    loadFilms();
    updateUrlQueryParams();
  },
  { deep: true },
);

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, () => {
  if (searchDebounceTimer !== null) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadFilms();
    updateUrlQueryParams();
  }, 300);
});

const openAddFilm = (emulsionId?: string) => {
  if (emulsionId) {
    form.value.emulsionId = emulsionId;
    onEmulsionChange();
  }
  showModal.value = true;
};

onMounted(async () => {
  const stateParam = route.query.state;
  if (stateParam) {
    const states = Array.isArray(stateParam) ? stateParam : [stateParam];
    selectedStates.value = states.filter((s): s is string => s !== null);
  }
  const emulsionIdParam = route.query.emulsionId;
  if (emulsionIdParam && typeof emulsionIdParam === "string") {
    selectedEmulsionId.value = parseInt(emulsionIdParam, 10) || null;
  }
  const formatIdParam = route.query.formatId;
  if (formatIdParam && typeof formatIdParam === "string") {
    selectedFormatId.value = parseInt(formatIdParam, 10) || null;
  }
  const tagIdParam = route.query.tagId;
  if (tagIdParam) {
    const ids = Array.isArray(tagIdParam) ? tagIdParam : [tagIdParam];
    selectedTagIds.value = ids.map(Number).filter(Boolean);
  }
  const fromParam = route.query.from;
  if (fromParam && typeof fromParam === "string")
    selectedFrom.value = fromParam;
  const toParam = route.query.to;
  if (toParam && typeof toParam === "string") selectedTo.value = toParam;
  const qParam = route.query.q;
  if (qParam && typeof qParam === "string") searchQuery.value = qParam;

  await Promise.all([
    loadFilms(),
    emulsionApi.getAll().then((r) => {
      emulsions.value = r.data;
    }),
    formatApi.getAll().then((r) => {
      formats.value = r.data;
    }),
    tagApi.getAll().then((r) => {
      tags.value = r.data;
    }),
    transitionApi.getProfiles().then((r) => {
      transitionProfiles.value = r.data;
    }),
    cameraApi.getAll().then((r) => {
      cameras.value = r.data;
    }),
  ]);

  const openWithEmulsionId = route.query.emulsionId as string | undefined;
  if (openWithEmulsionId && selectedEmulsionId.value === null)
    openAddFilm(openWithEmulsionId);
});
</script>
