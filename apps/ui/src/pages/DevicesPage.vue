<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { FRAME_SIZE_CODES, type CreateFilmDeviceRequest, type FilmDevice } from '@frollz2/schema/dist/film.js';
import { getFrameSizeCodesForFormatCode } from '@frollz2/schema/dist/film-format-definition.js';
import { useDeviceStore } from '../stores/devices.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../composables/idempotency.js';

const route = useRoute();
const deviceStore = useDeviceStore();
const referenceStore = useReferenceStore();
const feedback = useUiFeedback();
const search = ref('');
const isCreateDialogOpen = ref(false);
const isCreating = ref(false);
const idempotencyKey = ref(createIdempotencyKey());

const createForm = reactive({
  deviceTypeCode: 'camera',
  filmFormatId: null as number | null,
  frameSize: 'full_frame' as CreateFilmDeviceRequest['frameSize'],
  make: '',
  model: '',
  name: '',
  system: '',
  brand: '',
  slotCount: 2,
  holderTypeId: null as number | null
});

const selectedFilmFormatCode = computed(() => {
  const selectedFilmFormat = referenceStore.filmFormats.find((format) => format.id === createForm.filmFormatId);
  return selectedFilmFormat?.code ?? null;
});

const frameSizeOptions = computed(() => {
  if (!selectedFilmFormatCode.value) {
    return [...FRAME_SIZE_CODES];
  }
  return [...getFrameSizeCodesForFormatCode(selectedFilmFormatCode.value)];
});

const routeTypeFilter = computed(() => {
  const value = route.meta.deviceTypeFilter;
  return typeof value === 'string' ? value : null;
});

const rows = computed(() => {
  const query = search.value.trim().toLowerCase();

  return deviceStore.devices.filter((device) => {
    if (routeTypeFilter.value && device.deviceTypeCode !== routeTypeFilter.value) {
      return false;
    }

    if (!query) {
      return true;
    }

    return deviceLabel(device).toLowerCase().includes(query);
  });
});

const columns = [
  {
    name: 'name',
    label: 'Device',
    field: (row: FilmDevice) => deviceLabel(row),
    sortable: true,
    align: 'left'
  },
  {
    name: 'type',
    label: 'Type',
    field: (row: FilmDevice) => row.deviceTypeCode,
    sortable: true,
    align: 'left'
  },
  {
    name: 'format',
    label: 'Film Format',
    field: (row: FilmDevice) => row.filmFormatId,
    align: 'left'
  },
  {
    name: 'frame',
    label: 'Frame Size',
    field: (row: FilmDevice) => row.frameSize,
    align: 'left'
  }
];

const deviceTypeOptions = computed(() =>
  referenceStore.deviceTypes.map((type) => ({
    label: type.label,
    value: type.code
  }))
);

const filmFormatOptions = computed(() =>
  referenceStore.filmFormats.map((format) => ({
    label: format.label,
    value: format.id
  }))
);

const holderTypeOptions = computed(() =>
  referenceStore.holderTypes.map((type) => ({
    label: type.label,
    value: type.id
  }))
);

function deviceLabel(device: FilmDevice): string {
  if (device.deviceTypeCode === 'camera') {
    return `${device.make} ${device.model}`;
  }

  if (device.deviceTypeCode === 'film_holder') {
    return `${device.brand} ${device.name}`;
  }

  return device.name;
}

function resetCreateForm(): void {
  createForm.deviceTypeCode = 'camera';
  createForm.filmFormatId = null;
  createForm.frameSize = FRAME_SIZE_CODES[0];
  createForm.make = '';
  createForm.model = '';
  createForm.name = '';
  createForm.system = '';
  createForm.brand = '';
  createForm.slotCount = 2;
  createForm.holderTypeId = null;
  idempotencyKey.value = createIdempotencyKey();
}

watch(frameSizeOptions, (options) => {
  if (options.length === 0) {
    return;
  }
  if (!options.includes(createForm.frameSize)) {
    const nextFrameSize = options[0];
    if (!nextFrameSize) {
      return;
    }
    createForm.frameSize = nextFrameSize;
  }
}, { immediate: true });

function openCreateDialog(): void {
  resetCreateForm();
  isCreateDialogOpen.value = true;
}

async function submitCreate(): Promise<void> {
  if (isCreating.value) {
    return;
  }

  const deviceType = referenceStore.deviceTypes.find((type) => type.code === createForm.deviceTypeCode);
  if (!deviceType || !createForm.filmFormatId) {
    feedback.error('Select device type and film format.');
    return;
  }

  let payload: CreateFilmDeviceRequest;

  if (createForm.deviceTypeCode === 'camera') {
    if (!createForm.make.trim() || !createForm.model.trim()) {
      feedback.error('Camera make and model are required.');
      return;
    }

    payload = {
      deviceTypeCode: 'camera',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      make: createForm.make.trim(),
      model: createForm.model.trim(),
      canUnload: true,
      loadMode: 'direct'
    };
  } else if (createForm.deviceTypeCode === 'interchangeable_back') {
    if (!createForm.name.trim() || !createForm.system.trim()) {
      feedback.error('Name and system are required.');
      return;
    }

    payload = {
      deviceTypeCode: 'interchangeable_back',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      name: createForm.name.trim(),
      system: createForm.system.trim()
    };
  } else {
    if (!createForm.name.trim() || !createForm.brand.trim() || !createForm.holderTypeId) {
      feedback.error('Film holder name, brand, and holder type are required.');
      return;
    }

    payload = {
      deviceTypeCode: 'film_holder',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      name: createForm.name.trim(),
      brand: createForm.brand.trim(),
      slotCount: createForm.slotCount as 1 | 2,
      holderTypeId: createForm.holderTypeId
    };
  }

  isCreating.value = true;
  try {
    await deviceStore.createDevice(payload, idempotencyKey.value);
    feedback.success('Device created.');
    isCreateDialogOpen.value = false;
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to create device.'));
  } finally {
    isCreating.value = false;
  }
}

onMounted(async () => {
  await Promise.allSettled([referenceStore.loadAll(), deviceStore.loadDevices()]);
});
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div>
        <div class="text-h5">Devices</div>
        <div class="text-subtitle2 text-grey-7">Cameras, backs, and holders.</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn color="primary" label="Add device" @click="openCreateDialog" />
        <q-btn flat color="primary" label="Refresh" @click="deviceStore.loadDevices" />
      </div>
    </div>

    <q-banner v-if="deviceStore.listError" class="bg-red-1 text-negative" rounded>
      {{ deviceStore.listError }}
    </q-banner>

    <q-input v-model="search" filled label="Search devices" clearable />

    <q-table :rows="rows" :columns="columns" row-key="id" flat bordered :loading="deviceStore.isLoading">
      <template #body-cell-name="props">
        <q-td :props="props">
          <RouterLink :to="`/devices/${props.row.id}`" class="text-primary text-weight-medium">
            {{ deviceLabel(props.row) }}
          </RouterLink>
        </q-td>
      </template>
      <template #body-cell-type="props">
        <q-td :props="props">
          <q-badge color="primary" outline>{{ props.row.deviceTypeCode }}</q-badge>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="isCreateDialogOpen">
      <q-card style="min-width: min(92vw, 640px);">
        <q-card-section>
          <div class="text-h6">Create device</div>
        </q-card-section>

        <q-card-section>
          <q-form class="column q-gutter-md" @submit="submitCreate">
            <q-select
              v-model="createForm.deviceTypeCode"
              filled
              emit-value
              map-options
              :options="deviceTypeOptions"
              label="Device type"
            />
            <q-select
              v-model="createForm.filmFormatId"
              filled
              emit-value
              map-options
              :options="filmFormatOptions"
              label="Film format"
            />
            <q-select v-model="createForm.frameSize" filled :options="frameSizeOptions" label="Frame size" />

            <template v-if="createForm.deviceTypeCode === 'camera'">
              <q-input v-model="createForm.make" filled label="Make" />
              <q-input v-model="createForm.model" filled label="Model" />
            </template>

            <template v-else-if="createForm.deviceTypeCode === 'interchangeable_back'">
              <q-input v-model="createForm.name" filled label="Name" />
              <q-input v-model="createForm.system" filled label="System" />
            </template>

            <template v-else>
              <q-input v-model="createForm.name" filled label="Holder name" />
              <q-input v-model="createForm.brand" filled label="Brand" />
              <q-select
                v-model="createForm.slotCount"
                filled
                :options="[1, 2]"
                label="Slot count"
              />
              <q-select
                v-model="createForm.holderTypeId"
                filled
                emit-value
                map-options
                :options="holderTypeOptions"
                label="Holder type"
              />
            </template>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn color="primary" label="Create" :loading="isCreating" @click="submitCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
