<template>
  <div>
    <div class="mb-6">
      <button
        @click="$router.push({ name: 'cameras' })"
        class="inline-flex items-center min-h-[44px] text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >
        ← Back to Cameras
      </button>
    </div>

    <div
      v-if="loading"
      role="status"
      aria-label="Loading camera detail"
      class="text-center py-12 text-gray-600 dark:text-gray-400"
    >
      Loading...
    </div>

    <div
      v-else-if="!camera"
      class="text-center py-12 text-gray-600 dark:text-gray-400"
    >
      Camera not found.
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {{ camera.brand }} {{ camera.model }}
        </h1>
        <span :class="statusClass(camera.status)" class="mt-2 inline-block">
          {{ statusLabel(camera.status) }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Details card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2
            class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4"
          >
            Details
          </h2>
          <dl class="space-y-3">
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Brand</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ camera.brand }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Model</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ camera.model }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Status</dt>
              <dd>
                <span :class="statusClass(camera.status)">{{
                  statusLabel(camera.status)
                }}</span>
              </dd>
            </div>
            <div
              v-if="camera.acceptedFormats.length"
              class="flex justify-between text-sm"
            >
              <dt class="text-gray-500 dark:text-gray-400">Accepted Formats</dt>
              <dd class="text-gray-900 dark:text-gray-100 text-right">
                {{ formatNames }}
              </dd>
            </div>
            <div v-if="camera.serialNumber" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Serial Number</dt>
              <dd class="text-gray-900 dark:text-gray-100">
                {{ camera.serialNumber }}
              </dd>
            </div>
            <div v-if="camera.purchasePrice" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Purchase Price</dt>
              <dd class="text-gray-900 dark:text-gray-100">
                ${{ camera.purchasePrice.toFixed(2) }}
              </dd>
            </div>
            <div v-if="camera.acquiredAt" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Acquired</dt>
              <dd class="text-gray-900 dark:text-gray-100">
                {{ formatDate(camera.acquiredAt) }}
              </dd>
            </div>
            <div v-if="camera.notes" class="flex flex-col gap-1 text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Notes</dt>
              <dd class="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {{ camera.notes }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Film history card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2
            class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4"
          >
            Film History
          </h2>

          <div
            v-if="filmsLoading"
            role="status"
            aria-label="Loading film history"
            class="text-sm text-gray-600 dark:text-gray-400 py-4 text-center"
          >
            Loading...
          </div>

          <div
            v-else-if="films.length === 0"
            class="text-sm text-gray-600 dark:text-gray-400 py-4 text-center italic"
          >
            No films have been loaded into this camera yet.
          </div>

          <ul v-else class="space-y-3">
            <li
              v-for="film in films"
              :key="film.id"
              class="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0"
            >
              <RouterLink
                :to="{ name: 'film-detail', params: { key: film.id } }"
                class="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                {{ film.name }} — {{ film.emulsion.manufacturer }}
                {{ film.emulsion.brand }} ISO {{ film.emulsion.speed }}
              </RouterLink>
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full shrink-0"
                :class="getStateColor(currentStateName(film))"
              >
                {{ currentStateName(film) || "No state" }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { cameraApi, filmApi } from "@/services/api-client";
import type { Camera, Film } from "@frollz/shared";
import { currentStateName } from "@/types";
import { getStateColor } from "@/utils/stateColors";

const route = useRoute();

const camera = ref<Camera | null>(null);
const films = ref<Film[]>([]);
const loading = ref(true);
const filmsLoading = ref(true);

const formatNames = computed(() =>
  camera.value
    ? camera.value.acceptedFormats
        .map((af) => af.format?.name ?? `Format ${af.formatId}`)
        .join(", ")
    : "",
);

function statusLabel(status: Camera["status"]): string {
  if (status === "active") return "Active";
  if (status === "retired") return "Retired";
  return "In Repair";
}

function statusClass(status: Camera["status"]): string {
  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  if (status === "active")
    return `${base} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300`;
  if (status === "retired")
    return `${base} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`;
  return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

onMounted(async () => {
  const id = Number(route.params.id);
  try {
    const res = await cameraApi.getById(id);
    camera.value = res.data;
  } finally {
    loading.value = false;
  }

  filmsLoading.value = true;
  try {
    const res = await filmApi.getAll({ cameraId: id });
    films.value = res.data;
  } finally {
    filmsLoading.value = false;
  }
});
</script>
