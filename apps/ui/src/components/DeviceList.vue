<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { type FilmDevice, filmFormatDefinitions } from '@frollz2/schema';
import { useDeviceStore } from '../stores/devices.js';
import { useReferenceStore } from '../stores/reference.js';
import CreateDeviceDialog from './CreateDeviceDialog.vue';

const frameSizeLabelMap = new Map(
  Object.values(filmFormatDefinitions).flatMap((f) => f.frameSizes.map((fs) => [fs.code, fs.label]))
);

const route = useRoute();
const deviceStore = useDeviceStore();
const referenceStore = useReferenceStore();
const search = ref<string | null>('');
const isCreateDialogOpen = ref(false);

const routeTypeFilter = computed(() => {
  const value = route.meta.deviceTypeFilter;
  return typeof value === 'string' ? value : null;
});

const rows = computed(() => {
  const query = (search.value ?? '').trim().toLowerCase();

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
    field: (row: FilmDevice) => referenceStore.filmFormats.find((f) => f.id === row.filmFormatId)?.label,
    align: 'left'
  },
  {
    name: 'frame',
    label: 'Frame Size',
    field: (row: FilmDevice) => (row.frameSize ? (frameSizeLabelMap.get(row.frameSize) ?? row.frameSize) : '—'),
    align: 'left'
  }
];

function deviceLabel(device: FilmDevice): string {
  if (device.deviceTypeCode === 'camera') {
    return `${device.make} ${device.model}`;
  }

  if (device.deviceTypeCode === 'film_holder') {
    return `${device.brand} ${device.name}`;
  }

  return device.name;
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
        <q-btn color="primary" label="Add device" @click="isCreateDialogOpen = true" />
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

    <CreateDeviceDialog v-model="isCreateDialogOpen"
      v-bind="routeTypeFilter ? { deviceTypeFilter: routeTypeFilter } : {}" />
  </q-page>
</template>
