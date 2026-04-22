<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NSpin,
  NTag,
  NText,
  NTimeline,
  NTimelineItem
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { FilmHolderSlot } from '@frollz2/schema';
import PageShell from '../components/PageShell.vue';
import EntityDetailHeaderCard from '../components/inventory/EntityDetailHeaderCard.vue';
import InventorySplitLayout from '../components/inventory/InventorySplitLayout.vue';
import { useReferenceStore } from '../stores/reference.js';
import { useDeviceStore } from '../stores/devices.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { devicePrimaryLabel } from './device-dashboard.js';
import { mapDeviceLoadEventsToTimeline } from './device-detail-timeline.js';

const route = useRoute();
const router = useRouter();
const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();
const feedback = useUiFeedback();

const deviceId = computed(() => Number(route.params.id));
const selectedDevice = computed(() => deviceStore.currentDevice);
const isCompactTimeline = ref(false);
let timelineMediaQuery: MediaQueryList | null = null;

const slotColumns: DataTableColumns<FilmHolderSlot> = [
  { title: 'Side', key: 'sideNumber', render: (row) => `#${row.sideNumber}` },
  {
    title: 'State',
    key: 'slotStateCode',
    render: (row) => row.slotStateCode
  },
  {
    title: 'Loaded film',
    key: 'loadedFilmId',
    render: (row) => row.loadedFilmId ?? '-'
  }
];

const detailItems = computed(() => {
  if (!selectedDevice.value) {
    return [];
  }

  const formatCode = referenceStore.filmFormats.find((format) => format.id === selectedDevice.value?.filmFormatId)?.code
    ?? String(selectedDevice.value.filmFormatId);

  const shared = [
    { label: 'Film format', value: formatCode },
    { label: 'Frame size', value: selectedDevice.value.frameSize },
    { label: 'Device ID', value: String(selectedDevice.value.id) }
  ];

  if (selectedDevice.value.deviceTypeCode === 'camera') {
    return [
      ...shared,
      { label: 'Make', value: selectedDevice.value.make },
      { label: 'Model', value: selectedDevice.value.model },
      { label: 'Serial', value: selectedDevice.value.serialNumber ?? '-' }
    ];
  }

  if (selectedDevice.value.deviceTypeCode === 'interchangeable_back') {
    return [
      ...shared,
      { label: 'Name', value: selectedDevice.value.name },
      { label: 'System', value: selectedDevice.value.system }
    ];
  }

  return [
    ...shared,
    { label: 'Name', value: selectedDevice.value.name },
    { label: 'Brand', value: selectedDevice.value.brand },
    { label: 'Holder type', value: selectedDevice.value.holderTypeCode }
  ];
});

const timelinePlacement = computed<'left' | 'right'>(() => (isCompactTimeline.value ? 'left' : 'right'));
const timelineItems = computed(() => mapDeviceLoadEventsToTimeline(deviceStore.currentLoadEvents));

function syncTimelinePlacement(eventOrQuery: MediaQueryList | MediaQueryListEvent): void {
  isCompactTimeline.value = eventOrQuery.matches;
}

function goBack(): void {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push('/devices');
}

onMounted(async () => {
  timelineMediaQuery = window.matchMedia('(max-width: 768px)');
  syncTimelinePlacement(timelineMediaQuery);
  timelineMediaQuery.addEventListener('change', syncTimelinePlacement);

  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }

    await deviceStore.loadDevice(deviceId.value);
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load device detail.'));
  }
});

onBeforeUnmount(() => {
  timelineMediaQuery?.removeEventListener('change', syncTimelinePlacement);
  timelineMediaQuery = null;
});
</script>

<template>
  <PageShell title="Device Detail" subtitle="Review device metadata, holder slot state, and film load timeline.">
    <template #actions>
      <NButton tertiary @click="goBack">Back</NButton>
    </template>

    <NAlert v-if="deviceStore.detailError" type="error" :show-icon="true" style="margin-bottom: 12px;">
      {{ deviceStore.detailError }}
    </NAlert>

    <NSpin :show="deviceStore.isLoadingDetail">
      <InventorySplitLayout left-panel-title="Device details" right-panel-title="Film load timeline">
        <template #left>
          <EntityDetailHeaderCard
            v-if="selectedDevice"
            :title="devicePrimaryLabel(selectedDevice)"
            :tag-label="selectedDevice.deviceTypeCode.replace('_', ' ')"
            tag-type="primary"
            :details="detailItems"
          />

          <NCard v-if="selectedDevice?.deviceTypeCode === 'film_holder'">
            <template #header>
              <NTag size="small" type="info">Holder slots</NTag>
            </template>
            <NDataTable
              :columns="slotColumns"
              :data="deviceStore.currentSlots"
              :loading="deviceStore.isLoadingDetail"
              :row-key="(row) => row.id"
              :bordered="false"
            />
            <NEmpty
              v-if="!deviceStore.isLoadingDetail && deviceStore.currentSlots.length === 0"
              description="No slots found for this holder."
            />
          </NCard>

          <NEmpty v-if="!deviceStore.isLoadingDetail && !selectedDevice" description="Device not found." />
        </template>

        <template #right>
          <NCard>
            <NTimeline v-if="timelineItems.length > 0" :item-placement="timelinePlacement" class="device-detail__timeline">
              <NTimelineItem v-for="item in timelineItems" :key="item.eventId" class="device-detail__timeline-item">
                <template #icon>
                  <span class="device-detail__timeline-dot" :style="{ backgroundColor: item.dotColor }" />
                </template>
                <div class="device-detail__timeline-item-content">
                  <NText :style="{ color: item.titleColor }" class="device-detail__timeline-title">{{ item.filmName }}</NText>
                  <NText class="device-detail__timeline-emulsion">{{ item.emulsionName }}</NText>
                  <NText v-if="item.stockLabel" depth="3" class="device-detail__timeline-stock">{{ item.stockLabel }}</NText>
                  <NText depth="3" class="device-detail__timeline-item-date">{{ item.occurredLabel }}</NText>
                  <NText v-if="item.removedLabel" depth="3" class="device-detail__timeline-item-date">Removed: {{ item.removedLabel }}</NText>
                  <NText v-if="item.slotLabel" depth="3">{{ item.slotLabel }}</NText>
                </div>
              </NTimelineItem>
            </NTimeline>
            <NEmpty v-else-if="!deviceStore.isLoadingDetail" description="No load events yet for this device." />
          </NCard>
        </template>
      </InventorySplitLayout>
    </NSpin>
  </PageShell>
</template>

<style scoped>
.device-detail__timeline {
  margin-top: 0;
}

.device-detail__timeline-item {
  padding-bottom: 8px;
}

.device-detail__timeline-title {
  display: block;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 2px;
}

.device-detail__timeline-emulsion {
  display: block;
  line-height: 1.2;
  margin-bottom: 2px;
}

.device-detail__timeline-stock {
  display: block;
  line-height: 1.2;
  margin-bottom: 2px;
}

.device-detail__timeline-item-content {
  width: 100%;
}

.device-detail__timeline-item-date {
  display: block;
  line-height: 1.2;
}

.device-detail__timeline-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
</style>
