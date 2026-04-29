<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { DeviceLoadTimelineEvent, FilmHolderSlot } from '@frollz2/schema';
import { useDeviceStore } from '../../stores/devices.js';

const route = useRoute();
const deviceStore = useDeviceStore();

const deviceId = computed(() => Number(route.params.id));

const timelineColumns = [
  {
    name: 'filmName',
    label: 'Film',
    field: 'filmName',
    sortable: true,
    align: 'left'
  },
  {
    name: 'emulsionName',
    label: 'Emulsion',
    field: 'emulsionName',
    align: 'left'
  },
  {
    name: 'occurredAt',
    label: 'Loaded At',
    field: 'occurredAt',
    align: 'left'
  },
  {
    name: 'removedAt',
    label: 'Removed At',
    field: (row: DeviceLoadTimelineEvent) => row.removedAt ?? 'Active',
    align: 'left'
  }
];

const slotColumns = [
  {
    name: 'sideNumber',
    label: 'Side',
    field: 'sideNumber',
    align: 'left'
  },
  {
    name: 'slotStateCode',
    label: 'State',
    field: 'slotStateCode',
    align: 'left'
  },
  {
    name: 'loadedFilmId',
    label: 'Loaded film',
    field: (row: FilmHolderSlot) => row.loadedFilmId ?? 'None',
    align: 'left'
  }
];

function deviceLabel(): string {
  const device = deviceStore.currentDevice;

  if (!device) {
    return '';
  }

  if (device.deviceTypeCode === 'camera') {
    return `${device.make} ${device.model}`;
  }

  if (device.deviceTypeCode === 'film_holder') {
    return `${device.brand} ${device.name}`;
  }

  return device.name;
}

async function load(): Promise<void> {
  if (!Number.isFinite(deviceId.value)) {
    return;
  }

  await deviceStore.loadDevice(deviceId.value);
}

onMounted(load);
watch(deviceId, load);
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <q-btn flat color="primary" icon="arrow_back" label="Back to devices" to="/devices" class="self-start" />

    <q-banner v-if="deviceStore.detailError" class="bg-red-1 text-negative" rounded>
      {{ deviceStore.detailError }}
    </q-banner>

    <q-card v-if="deviceStore.currentDevice" flat bordered>
      <q-card-section>
        <div class="text-h5">{{ deviceLabel() }}</div>
        <div class="text-subtitle2 text-grey-7">{{ deviceStore.currentDevice.deviceTypeCode }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6"><span class="text-grey-7">Device ID:</span> {{ deviceStore.currentDevice.id }}</div>
          <div class="col-12 col-md-6"><span class="text-grey-7">Film format ID:</span> {{ deviceStore.currentDevice.filmFormatId }}</div>
          <div class="col-12 col-md-6"><span class="text-grey-7">Frame size:</span> {{ deviceStore.currentDevice.frameSize }}</div>
          <div class="col-12 col-md-6"><span class="text-grey-7">Type:</span> {{ deviceStore.currentDevice.deviceTypeCode }}</div>
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="deviceStore.currentSlots.length > 0" flat bordered>
      <q-card-section class="text-subtitle1">Film holder slots</q-card-section>
      <q-separator />
      <q-card-section>
        <q-table
          :rows="deviceStore.currentSlots"
          :columns="slotColumns"
          row-key="id"
          flat
          bordered
        />
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section class="text-subtitle1">Load timeline</q-card-section>
      <q-separator />
      <q-card-section>
        <q-table
          :rows="deviceStore.currentLoadEvents"
          :columns="timelineColumns"
          row-key="eventId"
          flat
          bordered
          :loading="deviceStore.isLoadingDetail"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>
