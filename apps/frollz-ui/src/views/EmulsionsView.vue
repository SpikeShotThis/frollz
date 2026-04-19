<template>
  <div>
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8"
    >
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Emulsions
      </h1>
      <button
        @click="showModal = true"
        class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
      >
        Add Emulsion
      </button>
    </div>

    <!-- Active Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4 min-h-[2rem]">
      <span class="text-sm text-gray-500 dark:text-gray-400 font-medium"
        >Filters:</span
      >
      <span
        v-if="activeFilters.length === 0"
        class="text-sm text-gray-600 dark:text-gray-400 italic"
      >
        <span class="hidden md:inline"
          >Click any value in the table to filter by that field</span
        >
        <span class="md:hidden">No active filters</span>
      </span>
      <template v-else>
        <span
          v-for="(filter, index) in activeFilters"
          :key="index"
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 font-medium"
        >
          {{ filter.label }}: {{ filter.value }}
          <button
            @click="removeFilter(index)"
            class="ml-1 inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 font-bold"
          >
            &times;
          </button>
        </span>
        <button
          @click="clearFilters"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Clear all
        </button>
      </template>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div
      class="md:hidden space-y-3"
      :aria-busy="isLoading"
      aria-label="Emulsions list"
    >
      <p
        v-if="sortedEmulsions.length === 0"
        class="text-center py-8 text-gray-600 dark:text-gray-400 italic"
      >
        No emulsions found.
      </p>
      <div
        v-for="emulsion in sortedEmulsions"
        :key="emulsion.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
      >
        <div class="flex justify-between items-start gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <img
              :src="boxImageSrc(emulsion)"
              :alt="emulsion.boxImageMimeType ? 'Box image' : 'Placeholder'"
              class="w-12 h-12 object-contain rounded shrink-0"
            />
            <div class="min-w-0">
              <p
                class="font-semibold text-gray-900 dark:text-gray-100 truncate"
              >
                {{ emulsion.brand }}
              </p>
              <p
                class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate"
              >
                {{ emulsion.manufacturer }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {{ formatNameById[emulsion.formatId] ?? "—" }} · ISO
                {{ emulsion.speed }}
              </p>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <span
              class="px-2 text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >{{ processNameById[emulsion.processId] ?? "—" }}</span
            >
            <button
              @click="createFilm(emulsion.id)"
              class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
              title="Add film from this emulsion"
              aria-label="Add film from this emulsion"
            >
              Add Film
            </button>
          </div>
        </div>
        <div
          v-if="emulsionTagMap[emulsion.id]?.length"
          class="flex flex-wrap gap-1 mt-2"
        >
          <span
            v-for="tag in emulsionTagMap[emulsion.id]"
            :key="tag.id"
            class="px-2 py-0.5 rounded text-xs font-medium text-white"
            :style="{ backgroundColor: tag.colorCode }"
            >{{ tag.name }}</span
          >
        </div>
      </div>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div
      class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md"
      :aria-busy="isLoading"
      aria-label="Emulsions table"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                @click="setSort('brand')"
                :class="[
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none',
                  sortField === 'brand' ? 'bg-gray-200 dark:bg-gray-600' : '',
                ]"
              >
                Brand
                {{
                  sortField === "brand"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""
                }}
              </th>
              <th
                @click="setSort('manufacturer')"
                :class="[
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none',
                  sortField === 'manufacturer'
                    ? 'bg-gray-200 dark:bg-gray-600'
                    : '',
                ]"
              >
                Manufacturer
                {{
                  sortField === "manufacturer"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""
                }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Format
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Process
              </th>
              <th
                @click="setSort('speed')"
                :class="[
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none',
                  sortField === 'speed' ? 'bg-gray-200 dark:bg-gray-600' : '',
                ]"
              >
                Speed
                {{
                  sortField === "speed"
                    ? sortDirection === "asc"
                      ? "↑"
                      : "↓"
                    : ""
                }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Tags
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Image
              </th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody
            class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
          >
            <tr v-for="emulsion in sortedEmulsions" :key="emulsion.id">
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('brand', 'Brand', emulsion.brand)"
              >
                {{ emulsion.brand }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="
                  addFilter(
                    'manufacturer',
                    'Manufacturer',
                    emulsion.manufacturer,
                  )
                "
              >
                {{ emulsion.manufacturer }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
              >
                {{ formatNameById[emulsion.formatId] ?? "—" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {{ processNameById[emulsion.processId] ?? "—" }}
                </span>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('speed', 'Speed', String(emulsion.speed))"
              >
                ISO {{ emulsion.speed }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in emulsionTagMap[emulsion.id]"
                    :key="tag.id"
                    class="px-2 py-1 rounded text-xs font-medium text-white"
                    :style="{ backgroundColor: tag.colorCode }"
                  >
                    {{ tag.name }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <img
                  :src="boxImageSrc(emulsion)"
                  :alt="emulsion.boxImageMimeType ? 'Box image' : 'Placeholder'"
                  class="w-12 h-12 object-contain rounded"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button
                  @click="createFilm(emulsion.id)"
                  class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
                  title="Add film from this emulsion"
                  aria-label="Add film from this emulsion"
                >
                  Add Film
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Emulsion Modal -->
    <BaseModal
      :open="showModal"
      title-id="add-emulsion-title"
      @close="closeModal"
    >
      <h2
        id="add-emulsion-title"
        class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
      >
        Add Emulsion
      </h2>
      <form @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <div>
            <p
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Brand <span class="text-red-500" aria-hidden="true">*</span>
            </p>
            <TypeaheadInput
              id="emulsion-brand"
              aria-label="Brand"
              aria-required="true"
              v-model="form.brand"
              :fetchOptions="
                (q) => emulsionApi.getBrands(q).then((r) => r.data)
              "
              required
              placeholder="e.g. Kodak"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <p
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Manufacturer
              <span class="text-red-500" aria-hidden="true">*</span>
            </p>
            <TypeaheadInput
              id="emulsion-manufacturer"
              aria-label="Manufacturer"
              aria-required="true"
              v-model="form.manufacturer"
              :fetchOptions="
                (q) => emulsionApi.getManufacturers(q).then((r) => r.data)
              "
              required
              placeholder="e.g. Kodak Alaris"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label
              for="emulsion-process"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Process <span class="text-red-500" aria-hidden="true">*</span>
              <select
                id="emulsion-process"
                v-model="form.processId"
                required
                aria-required="true"
                class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="" disabled>Select a process</option>
                <option v-for="p in processes" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Formats <span class="text-red-500" aria-hidden="true">*</span>
            </legend>
            <div
              class="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[2.5rem] bg-white dark:bg-gray-700"
            >
              <span
                v-if="!form.processId"
                class="text-sm text-gray-600 dark:text-gray-400 italic"
                >Select a process first</span
              >
              <label
                v-else
                v-for="fmt in availableFormats"
                :key="fmt.id"
                :for="'format-check-' + fmt.id"
                class="flex items-center gap-1 min-h-[44px] px-1 text-sm cursor-pointer text-gray-900 dark:text-gray-100"
              >
                <input
                  :id="'format-check-' + fmt.id"
                  type="checkbox"
                  :value="fmt.id"
                  v-model="form.formatIds"
                  class="rounded"
                />
                {{ fmt.name }}
              </label>
            </div>
          </fieldset>
          <div>
            <p
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Speed (ISO) <span class="text-red-500" aria-hidden="true">*</span>
            </p>
            <SpeedTypeaheadInput
              id="emulsion-speed"
              aria-label="Speed (ISO)"
              aria-required="true"
              v-model="form.speed"
              :fetchOptions="
                (q: string) => emulsionApi.getSpeeds(q).then((r) => r.data)
              "
              required
              min="1"
              placeholder="e.g. 400"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <div
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tags
            </div>
            <TagMultiSelect
              v-model="selectedTagIds"
              :available-tags="allTags"
              placeholder="Search tags…"
            />
          </div>
          <div>
            <label
              for="emulsion-box-image"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Box Image
              <input
                id="emulsion-box-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                @change="onBoxImageChange"
                class="mt-1 w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900 dark:file:text-primary-200 hover:file:bg-primary-100"
              />
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPEG, PNG, WebP or GIF · max 4 MB
            </p>
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
            {{ submitting ? "Adding..." : "Add Emulsion" }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import {
  emulsionApi,
  formatApi,
  processApi,
  tagApi,
} from "@/services/api-client";
import type { Emulsion, Format, Process, Tag } from "@/types";
import TypeaheadInput from "@/components/TypeaheadInput.vue";
import BaseModal from "@/components/BaseModal.vue";
import SpeedTypeaheadInput from "@/components/SpeedTypeaheadInput.vue";
import TagMultiSelect from "@/components/TagMultiSelect.vue";
import { useNotificationStore } from "@/stores/notification";
import placeholderColorNegative from "@/components/placeholder/color-negative.svg";
import placeholderBlackAndWhite from "@/components/placeholder/black-and-white.svg";
import placeholderMotionPicture from "@/components/placeholder/motion-picture.svg";
import placeholderColorPositive from "@/components/placeholder/color-positive.svg";

const PROCESS_PLACEHOLDER: Record<string, string> = {
  "C-41": placeholderColorNegative,
  "Black and White": placeholderBlackAndWhite,
  "ECN-2": placeholderMotionPicture,
  "E-6": placeholderColorPositive,
};

const router = useRouter();
const notification = useNotificationStore();

const emulsions = ref<Emulsion[]>([]);
const formats = ref<Format[]>([]);
const processes = ref<Process[]>([]);
const allTags = ref<Tag[]>([]);
const emulsionTagMap = ref<Record<string, Tag[]>>({});
const isLoading = ref(false);
const showModal = ref(false);
const submitting = ref(false);
const error = ref("");
const selectedTagIds = ref<number[]>([]);

type SortField = "brand" | "manufacturer" | "speed";
const sortField = ref<SortField>("brand");
const sortDirection = ref<"asc" | "desc">("asc");

const setSort = (field: SortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDirection.value = "asc";
  }
};

type ActiveFilter = { field: string; label: string; value: string };
const activeFilters = ref<ActiveFilter[]>([]);

const addFilter = (field: string, label: string, value: string) => {
  if (!value) return;
  const exists = activeFilters.value.some(
    (f) => f.field === field && f.value === value,
  );
  if (!exists) activeFilters.value.push({ field, label, value });
};

const removeFilter = (index: number) => activeFilters.value.splice(index, 1);
const clearFilters = () => {
  activeFilters.value = [];
};

const formatNameById = computed(() => {
  const map: Record<string, string> = {};
  for (const f of formats.value) map[f.id] = f.name;
  return map;
});

const processNameById = computed(() => {
  const map: Record<string, string> = {};
  for (const p of processes.value) map[p.id] = p.name;
  return map;
});

const boxImageSrc = (emulsion: Emulsion): string => {
  if (emulsion.boxImageMimeType)
    return `/api/emulsions/${emulsion.id}/box-image`;
  const processName = processNameById.value[emulsion.processId] ?? "";
  return PROCESS_PLACEHOLDER[processName] ?? placeholderColorNegative;
};

const availableFormats = computed(() => formats.value);

const boxImageFile = ref<File | null>(null);

const onBoxImageChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  boxImageFile.value = input.files?.[0] ?? null;
};

const emptyForm = () => ({
  brand: "",
  manufacturer: "",
  formatIds: [] as string[],
  processId: "",
  speed: undefined as number | undefined,
});

const form = ref(emptyForm());

watch(
  () => form.value.processId,
  () => {
    form.value.formatIds = [];
  },
);

const filteredAndSortedEmulsions = computed(() => {
  let result = emulsions.value;
  if (activeFilters.value.length > 0) {
    result = result.filter((emulsion) =>
      activeFilters.value.every((filter) => {
        if (filter.field === "tag") {
          const tags = emulsionTagMap.value[emulsion.id] ?? [];
          return tags.some((t) => t.name === filter.value);
        }
        if (filter.field === "speed")
          return String(emulsion.speed) === filter.value;
        return (
          (emulsion[filter.field as keyof Emulsion] ?? "") === filter.value
        );
      }),
    );
  }
  return result.slice().sort((a, b) => {
    let cmp: number;
    if (sortField.value === "speed") {
      cmp = (a.speed ?? 0) - (b.speed ?? 0);
    } else {
      const aVal = (a[sortField.value] ?? "").toString().toLowerCase();
      const bVal = (b[sortField.value] ?? "").toString().toLowerCase();
      cmp = aVal.localeCompare(bVal);
    }
    return sortDirection.value === "asc" ? cmp : -cmp;
  });
});

const sortedEmulsions = filteredAndSortedEmulsions;

const createFilm = (emulsionId: number) => {
  router.push({ name: "films", query: { emulsionId } });
};

const closeModal = () => {
  showModal.value = false;
  form.value = emptyForm();
  selectedTagIds.value = [];
  boxImageFile.value = null;
  error.value = "";
};

const handleSubmit = async () => {
  if (form.value.formatIds.length === 0) {
    error.value = "Please select at least one format";
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    const payload = {
      brand: form.value.brand,
      manufacturer: form.value.manufacturer,
      formatIds: form.value.formatIds.map(Number),
      processId: Number(form.value.processId),
      speed: form.value.speed!,
    };

    const response = await emulsionApi.createBulk(payload);
    const createdEmulsions = response.data;

    await Promise.all([
      ...createdEmulsions.flatMap((emulsion) =>
        selectedTagIds.value.map((tagId) =>
          emulsionApi.addTag(emulsion.id, tagId),
        ),
      ),
      ...(boxImageFile.value
        ? createdEmulsions.map((emulsion) =>
            emulsionApi.uploadBoxImage(emulsion.id, boxImageFile.value!),
          )
        : []),
    ]);

    await loadEmulsions();
    closeModal();
    notification.announce("Emulsion added");
  } catch (_) {
    error.value = "Failed to add emulsion. Please try again.";
  } finally {
    submitting.value = false;
  }
};

const buildEmulsionTagMap = async () => {
  const tagResponse = await tagApi.getAll();
  allTags.value = tagResponse.data;

  const map: Record<string, Tag[]> = {};
  for (const emulsion of emulsions.value) {
    map[emulsion.id] = emulsion.tags ?? [];
  }
  emulsionTagMap.value = map;
};

const loadEmulsions = async () => {
  isLoading.value = true;
  try {
    const response = await emulsionApi.getAll();
    emulsions.value = response.data;
    await buildEmulsionTagMap();
  } catch (err) {
    console.error("Error loading emulsions:", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    loadEmulsions(),
    formatApi.getAll().then((r) => {
      formats.value = r.data;
    }),
    processApi.getAll().then((r) => {
      processes.value = r.data;
    }),
  ]);
});
</script>
