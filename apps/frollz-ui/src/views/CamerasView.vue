<template>
  <div>
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8"
    >
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Cameras
      </h1>
      <button
        @click="openCreate"
        class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
      >
        Add Camera
      </button>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div
      class="md:hidden space-y-3"
      :aria-busy="isLoading"
      aria-label="Cameras list"
    >
      <p
        v-if="cameras.length === 0"
        class="text-center py-8 text-gray-600 dark:text-gray-400 italic"
      >
        No cameras found.
      </p>
      <div
        v-for="camera in cameras"
        :key="camera.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <RouterLink
              :to="{ name: 'camera-detail', params: { id: camera.id } }"
              class="font-semibold text-primary-600 dark:text-primary-400 hover:underline truncate block"
            >
              {{ camera.brand }} {{ camera.model }}
            </RouterLink>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              <span :class="statusClass(camera.status)">{{
                statusLabel(camera.status)
              }}</span>
            </p>
            <p
              v-if="camera.acceptedFormats.length"
              class="text-xs text-gray-500 dark:text-gray-400 mt-1"
            >
              {{ formatNames(camera) }}
            </p>
            <RouterLink
              v-if="loadedFilmByCameraId.get(camera.id)"
              :to="{ name: 'film-detail', params: { key: loadedFilmByCameraId.get(camera.id)!.id } }"
              class="mt-1 text-xs text-primary-600 dark:text-primary-400 hover:underline block"
            >
              ↳ {{ loadedFilmByCameraId.get(camera.id)!.name }} (loaded)
            </RouterLink>
          </div>
          <div class="flex gap-2 shrink-0">
            <button
              @click="openEdit(camera)"
              class="px-3 py-2.5 min-h-[44px] text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
            >
              Edit
            </button>
            <button
              @click="confirmDelete(camera)"
              class="px-3 py-2.5 min-h-[44px] text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Delete
            </button>
          </div>
        </div>
        <p
          v-if="camera.notes"
          class="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate"
        >
          {{ camera.notes }}
        </p>
      </div>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div
      class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md"
      :aria-busy="isLoading"
      aria-label="Cameras table"
    >
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Brand / Model
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Formats
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Notes
              </th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody
            class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
          >
            <tr v-for="camera in cameras" :key="camera.id">
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
              >
                <RouterLink
                  :to="{ name: 'camera-detail', params: { id: camera.id } }"
                  class="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  {{ camera.brand }} {{ camera.model }}
                </RouterLink>
                <span
                  v-if="camera.serialNumber"
                  class="block text-xs text-gray-400 dark:text-gray-500"
                  >#{{ camera.serialNumber }}</span
                >
                <RouterLink
                  v-if="loadedFilmByCameraId.get(camera.id)"
                  :to="{ name: 'film-detail', params: { key: loadedFilmByCameraId.get(camera.id)!.id } }"
                  class="block text-xs text-primary-600 dark:text-primary-400 hover:underline mt-0.5"
                >
                  ↳ {{ loadedFilmByCameraId.get(camera.id)!.name }} (loaded)
                </RouterLink>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span :class="statusClass(camera.status)">{{
                  statusLabel(camera.status)
                }}</span>
              </td>
              <td
                class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px]"
              >
                {{ formatNames(camera) || "—" }}
              </td>
              <td
                class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate"
              >
                {{ camera.notes ?? "—" }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                <button
                  @click="openEdit(camera)"
                  class="px-3 py-2 min-h-[44px] text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                >
                  Edit
                </button>
                <button
                  @click="confirmDelete(camera)"
                  class="px-3 py-2 min-h-[44px] text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="cameras.length === 0">
              <td
                colspan="5"
                class="px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-400"
              >
                No cameras found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <BaseModal
      :open="!!formMode"
      :title-id="formMode === 'create' ? 'create-camera-title' : 'edit-camera-title'"
      @close="closeForm"
    >
      <h2
        :id="formMode === 'create' ? 'create-camera-title' : 'edit-camera-title'"
        class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4"
      >
        {{ formMode === "create" ? "Add Camera" : "Edit Camera" }}
      </h2>

      <form @submit.prevent="submitForm" class="space-y-4">
        <!-- Brand -->
        <label
          for="camera-brand"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Brand <span class="text-red-500" aria-hidden="true">*</span>
          <input
            id="camera-brand"
            v-model="form.brand"
            type="text"
            required
            aria-required="true"
            placeholder="e.g. Nikon, Canon, Pentax"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>

        <!-- Model -->
        <label
          for="camera-model"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Model <span class="text-red-500" aria-hidden="true">*</span>
          <input
            id="camera-model"
            v-model="form.model"
            type="text"
            required
            aria-required="true"
            placeholder="e.g. FM2, AE-1, K1000"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>

        <!-- Status -->
        <label
          for="camera-status"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Status <span class="text-red-500" aria-hidden="true">*</span>
          <select
            id="camera-status"
            v-model="form.status"
            required
            aria-required="true"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="in_repair">In Repair</option>
          </select>
        </label>

        <!-- Accepted Formats -->
        <fieldset>
          <legend
            class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Accepted Formats
          </legend>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="fmt in formats"
              :key="fmt.id"
              :for="`camera-fmt-${fmt.id}`"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              ><input
                :id="`camera-fmt-${fmt.id}`"
                type="checkbox"
                :value="fmt.id"
                v-model="form.supportedFormatIds"
                class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              {{ fmt.name }}</label
            >
          </div>
        </fieldset>

        <!-- Serial Number -->
        <label
          for="camera-serial"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Serial Number
          <input
            id="camera-serial"
            v-model="form.serialNumber"
            type="text"
            placeholder="Optional"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>

        <!-- Purchase Price -->
        <label
          for="camera-price"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Purchase Price
          <input
            id="camera-price"
            v-model.number="form.purchasePrice"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Optional"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>

        <!-- Acquired At -->
        <label
          for="camera-acquired"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Acquired At
          <input
            id="camera-acquired"
            v-model="form.acquiredAt"
            type="date"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </label>

        <!-- Notes -->
        <label
          for="camera-notes"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Notes
          <textarea
            id="camera-notes"
            v-model="form.notes"
            rows="3"
            placeholder="Optional"
            class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </label>

        <div
          v-if="formError"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          {{ formError }}
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="closeForm"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
          >
            {{ formMode === "create" ? "Create" : "Save" }}
          </button>
        </div>
      </form>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal
      :open="!!deleteTarget"
      title-id="delete-camera-title"
      @close="deleteTarget = null"
    >
      <h2
        id="delete-camera-title"
        class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3"
      >
        Delete Camera
      </h2>
      <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
        Are you sure you want to delete
        <span class="font-semibold"
          >{{ deleteTarget?.brand }} {{ deleteTarget?.model }}</span
        >?
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        This action cannot be undone. If the camera has associated rolls, the
        delete will fail.
      </p>
      <div
        v-if="deleteError"
        role="alert"
        class="mb-4 text-sm text-red-600 dark:text-red-400"
      >
        {{ deleteError }}
      </div>
      <div class="flex justify-end gap-3">
        <button
          @click="deleteTarget = null"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          @click="executeDelete"
          class="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { cameraApi, filmApi, formatApi } from "@/services/api-client";
import type { Camera, Film, Format } from "@/types";
import BaseModal from "@/components/BaseModal.vue";
import { useNotificationStore } from "@/stores/notification";

const notification = useNotificationStore();

type FormMode = "create" | "edit" | null;

const cameras = ref<Camera[]>([]);
const formats = ref<Format[]>([]);
const loadedFilms = ref<Film[]>([]);
const isLoading = ref(false);

function getCameraIdFromLoadedFilm(film: Film): number | null {
  const loadedState = [...film.states]
    .sort((a, b) => b.id - a.id)
    .find((s) => s.state?.name === "Loaded");
  if (!loadedState) return null;
  const meta = loadedState.metadata.find(
    (m) => m.transitionStateMetadata?.field?.name === "cameraId",
  );
  const val = meta?.value;
  if (!val || Array.isArray(val)) return null;
  return parseInt(val, 10) || null;
}

const loadedFilmByCameraId = computed(() => {
  const map = new Map<number, Film>();
  for (const film of loadedFilms.value) {
    const cameraId = getCameraIdFromLoadedFilm(film);
    if (cameraId !== null) map.set(cameraId, film);
  }
  return map;
});

const formMode = ref<FormMode>(null);
const editingId = ref<number | null>(null);
const form = ref(emptyForm());
const formError = ref("");

const deleteTarget = ref<Camera | null>(null);
const deleteError = ref("");

function emptyForm() {
  return {
    brand: "",
    model: "",
    status: "active" as "active" | "retired" | "in_repair",
    supportedFormatIds: [] as number[],
    serialNumber: "",
    purchasePrice: null as number | null,
    acquiredAt: "",
    notes: "",
  };
}

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

function formatNames(camera: Camera): string {
  return camera.acceptedFormats
    .map((af) => af.format?.name ?? `Format ${af.formatId}`)
    .join(", ");
}

function toIsoDateTime(dateOnly: string): string {
  return new Date(`${dateOnly}T12:00:00`).toISOString();
}

const loadCameras = async () => {
  isLoading.value = true;
  try {
    const [cameraRes, filmRes] = await Promise.all([
      cameraApi.getAll(),
      filmApi.getAll({ state: ["Loaded"] }),
    ]);
    cameras.value = cameraRes.data;
    loadedFilms.value = filmRes.data;
  } catch (err) {
    console.error("Error loading cameras:", err);
  } finally {
    isLoading.value = false;
  }
};

const loadFormats = async () => {
  try {
    const res = await formatApi.getAll();
    formats.value = res.data;
  } catch (err) {
    console.error("Error loading formats:", err);
  }
};

function openCreate() {
  form.value = emptyForm();
  formError.value = "";
  editingId.value = null;
  formMode.value = "create";
}

function openEdit(camera: Camera) {
  form.value = {
    brand: camera.brand,
    model: camera.model,
    status: camera.status,
    supportedFormatIds: camera.acceptedFormats.map((af) => af.formatId),
    serialNumber: camera.serialNumber ?? "",
    purchasePrice: camera.purchasePrice ?? null,
    acquiredAt: camera.acquiredAt
      ? camera.acquiredAt.substring(0, 10)
      : "",
    notes: camera.notes ?? "",
  };
  formError.value = "";
  editingId.value = camera.id;
  formMode.value = "edit";
}

function closeForm() {
  formMode.value = null;
}

const submitForm = async () => {
  formError.value = "";
  const payload = {
    brand: form.value.brand,
    model: form.value.model,
    status: form.value.status,
    supportedFormatIds: form.value.supportedFormatIds.length
      ? form.value.supportedFormatIds
      : undefined,
    serialNumber: form.value.serialNumber || undefined,
    purchasePrice: form.value.purchasePrice ?? undefined,
    acquiredAt: form.value.acquiredAt
      ? toIsoDateTime(form.value.acquiredAt)
      : undefined,
    notes: form.value.notes || undefined,
  };

  try {
    if (formMode.value === "create") {
      await cameraApi.create(payload);
      notification.announce("Camera added");
    } else if (formMode.value === "edit" && editingId.value !== null) {
      await cameraApi.update(editingId.value, payload);
      notification.announce("Camera saved");
    }
    formMode.value = null;
    await loadCameras();
  } catch (err) {
    console.error("Error saving camera:", err);
    formError.value = "Failed to save camera. Please try again.";
  }
};

function confirmDelete(camera: Camera) {
  deleteError.value = "";
  deleteTarget.value = camera;
}

const executeDelete = async () => {
  if (!deleteTarget.value) return;
  deleteError.value = "";
  try {
    await cameraApi.delete(deleteTarget.value.id);
    deleteTarget.value = null;
    await loadCameras();
    notification.announce("Camera deleted");
  } catch (err) {
    console.error("Error deleting camera:", err);
    deleteError.value =
      "Could not delete this camera. It may have associated rolls.";
  }
};

onMounted(() => {
  loadCameras();
  loadFormats();
});
</script>
