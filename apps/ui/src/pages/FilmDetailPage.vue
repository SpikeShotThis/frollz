<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpin,
  NTimeline,
  NTimelineItem,
  NText
} from 'naive-ui';
import type { CreateFilmJourneyEventRequest, CreateFrameJourneyEventRequest, FilmJourneyEvent } from '@frollz2/schema';
import { filmTransitionMap } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';
import { useDeviceStore } from '../stores/devices.js';
import PageShell from '../components/PageShell.vue';
import EntityDetailHeaderCard from '../components/inventory/EntityDetailHeaderCard.vue';
import InventorySplitLayout from '../components/inventory/InventorySplitLayout.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

type FilmStateCode = CreateFilmJourneyEventRequest['filmStateCode'];

const route = useRoute();
const router = useRouter();
const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();
const feedback = useUiFeedback();

const filmId = computed(() => Number(route.params.id));
const isEventDrawerOpen = ref(false);
const isSavingEvent = ref(false);
const occurredAtTimestamp = ref<number | null>(Date.now());

const eventForm = reactive<{
  filmStateCode: FilmStateCode | null;
  notes: string;
  storageLocationId: number | null;
  filmFrameId: number | null;
  deviceId: number | null;
  slotSideNumber: number | null;
  intendedPushPull: number | null;
  labName: string;
  labContact: string;
  actualPushPull: number | null;
  scannerOrSoftware: string;
  scanLink: string;
}>({
  filmStateCode: null,
  notes: '',
  storageLocationId: null,
  filmFrameId: null,
  deviceId: null,
  slotSideNumber: null,
  intendedPushPull: null,
  labName: '',
  labContact: '',
  actualPushPull: null,
  scannerOrSoftware: '',
  scanLink: ''
});

const eventState = ref<FormState>({
  loading: false,
  fieldErrors: {},
  formError: null
});

const stateTypeByCode: Record<string, 'default' | 'info' | 'primary' | 'warning' | 'success'> = {
  purchased: 'default',
  stored: 'info',
  loaded: 'primary',
  exposed: 'warning',
  removed: 'warning',
  sent_for_dev: 'info',
  developed: 'success',
  scanned: 'success',
  archived: 'default'
};

const tagColorByType: Record<
  'default' | 'info' | 'primary' | 'warning' | 'success',
  { color: string; borderColor: string; textColor: string; dotColor: string }
> = {
  default: {
    color: '#f4f4f5',
    borderColor: '#e0e0e6',
    textColor: '#606266',
    dotColor: '#8c8c8c'
  },
  info: {
    color: '#e6f4ff',
    borderColor: '#8fc9ff',
    textColor: '#005980',
    dotColor: '#2080f0'
  },
  primary: {
    color: '#eef3ff',
    borderColor: '#9fb5ff',
    textColor: '#1b3f96',
    dotColor: '#4d6bfe'
  },
  warning: {
    color: '#fff8e6',
    borderColor: '#ffd06b',
    textColor: '#8a4d00',
    dotColor: '#f0a020'
  },
  success: {
    color: '#eaf8ef',
    borderColor: '#8bd9a8',
    textColor: '#165f31',
    dotColor: '#18a058'
  }
};

const selectedFilm = computed(() => filmStore.currentFilm);
const isLargeFormatFilm = computed(() => {
  const code = selectedFilm.value?.filmFormat.code;
  return code === '4x5' || code === '8x10' || code === '2x3';
});
const isCompactTimeline = ref(false);
let timelineMediaQuery: MediaQueryList | null = null;

const detailItems = computed(() => {
  if (!selectedFilm.value) {
    return [];
  }

  return [
    {
      label: 'Emulsion',
      value: `${selectedFilm.value.emulsion.manufacturer} ${selectedFilm.value.emulsion.brand} ${selectedFilm.value.emulsion.isoSpeed}`
    },
    { label: 'Format', value: selectedFilm.value.filmFormat.code },
    { label: 'Package', value: selectedFilm.value.packageType.code },
    { label: 'Expiration', value: selectedFilm.value.expirationDate ? formatDateTime(selectedFilm.value.expirationDate) : '-' },
    { label: 'Film ID', value: String(selectedFilm.value.id) }
  ];
});
const transitions = computed<Array<{ label: string; value: FilmStateCode }>>(() => {
  if (isLargeFormatFilm.value) {
    const selectedFrame = filmStore.currentFrames.find((frame) => frame.id === eventForm.filmFrameId) ?? null;
    const current = selectedFrame?.currentStateCode ?? 'purchased';
    const allowed = filmTransitionMap.get(current) ?? [];
    return referenceStore.filmStates
      .filter((state) => allowed.includes(state.code))
      .map((state) => ({ label: state.label, value: state.code as FilmStateCode }));
  }

  const current = selectedFilm.value?.currentStateCode;
  if (!current) {
    return [];
  }

  const allowed = filmTransitionMap.get(current) ?? [];
  return referenceStore.filmStates
    .filter((state) => allowed.includes(state.code))
    .map((state) => ({ label: state.label, value: state.code as FilmStateCode }));
});

const storageLocationOptions = computed(() =>
  referenceStore.storageLocations.map((location) => ({ label: location.label, value: location.id }))
);

const deviceOptions = computed(() =>
  deviceStore.devices
    .filter((device) => {
      if (!selectedFilm.value || device.filmFormatId !== selectedFilm.value.filmFormatId) {
        return false;
      }

      if (device.deviceTypeCode === 'camera') {
        return device.loadMode === 'direct';
      }

      return true;
    })
    .map((device) => ({
      label: humanizeDevice(device),
      value: device.id
    }))
);

const selectedLoadDevice = computed(() =>
  eventForm.filmStateCode === 'loaded' && eventForm.deviceId
    ? deviceStore.devices.find((device) => device.id === eventForm.deviceId) ?? null
    : null
);

const holderSlotOptions = computed(() => {
  if (!selectedLoadDevice.value || selectedLoadDevice.value.deviceTypeCode !== 'film_holder') {
    return [];
  }

  return Array.from({ length: selectedLoadDevice.value.slotCount }, (_, index) => {
    const slotNumber = index + 1;
    return { label: `Slot ${slotNumber}`, value: slotNumber };
  });
});

const availableFrameOptions = computed(() =>
  filmStore.currentFrames
    .filter((frame) => isLargeFormatFilm.value || frame.firstLoadedAt === null)
    .map((frame) => ({
      label: `Frame #${frame.frameNumber}${isLargeFormatFilm.value ? ` (${humanizeCode(frame.currentStateCode)})` : ''}`,
      value: frame.id
    }))
);

const timelinePlacement = computed<'left' | 'right'>(() => (isCompactTimeline.value ? 'left' : 'right'));

const timelineEvents = computed(() =>
  [...filmStore.currentEvents]
    .sort((left, right) => {
      const leftOccurredAt = parseOccurredAt(left.occurredAt);
      const rightOccurredAt = parseOccurredAt(right.occurredAt);
      if (leftOccurredAt !== rightOccurredAt) {
        return rightOccurredAt - leftOccurredAt;
      }

      return right.id - left.id;
    })
    .map((event) => ({
      id: event.id,
      stateLabel: humanizeCode(event.filmStateCode),
      occurredLabel: formatDateTime(event.occurredAt),
      detailFields: eventDataEntries(event),
      notes: normalizeOptionalText(event.notes),
      dotColor: tagColorByType[stateTypeByCode[event.filmStateCode] ?? 'default'].dotColor
    }))
);

function parseOccurredAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

function humanizeCode(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function humanizeDevice(device: Record<string, unknown> & { deviceTypeCode: string }): string {
  if (device.deviceTypeCode === 'camera') {
    return `${String(device.make ?? '')} ${String(device.model ?? '')}`.trim();
  }
  if (device.deviceTypeCode === 'interchangeable_back') {
    return `${String(device.name ?? '')} ${String(device.system ?? '')}`.trim();
  }
  return `${String(device.name ?? '')} ${String(device.brand ?? '')}`.trim();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function syncTimelinePlacement(eventOrQuery: MediaQueryList | MediaQueryListEvent): void {
  isCompactTimeline.value = eventOrQuery.matches;
}

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

function eventDataSummary(event: FilmJourneyEvent): string {
  const entries = eventDataEntries(event).map((entry) => `${entry.label}: ${entry.value}`);

  return entries.length > 0 ? entries.join(' | ') : '-';
}

function eventDataEntries(event: FilmJourneyEvent): Array<{ label: string; value: string }> {
  const loadTargetType = typeof event.eventData['loadTargetType'] === 'string' ? event.eventData['loadTargetType'] : null;
  if (loadTargetType) {
    const deviceId = (
      typeof event.eventData['cameraId'] === 'number'
        ? event.eventData['cameraId']
        : typeof event.eventData['interchangeableBackId'] === 'number'
          ? event.eventData['interchangeableBackId']
          : typeof event.eventData['filmHolderId'] === 'number'
            ? event.eventData['filmHolderId']
            : null
    );
    const slotNumber = typeof event.eventData['slotNumber'] === 'number' ? event.eventData['slotNumber'] : null;
    const device = deviceId ? deviceStore.devices.find((entry) => entry.id === deviceId) : null;

    const entries: Array<{ label: string; value: string }> = [];
    if (deviceId) {
      entries.push({
        label: 'Loaded Target',
        value: device ? humanizeDevice(device) : String(deviceId)
      });
    }
    if (slotNumber) {
      entries.push({ label: 'Holder Slot', value: String(slotNumber) });
    }

    const passthrough = Object.entries(event.eventData)
      .filter(([key]) => !['loadTargetType', 'cameraId', 'interchangeableBackId', 'filmHolderId', 'slotNumber'].includes(key))
      .map(([key, value]) => toReadableEventField(key, value))
      .filter((entry): entry is { label: string; value: string } => entry !== null);

    return [...entries, ...passthrough];
  }

  return Object.entries(event.eventData)
    .map(([key, value]) => toReadableEventField(key, value))
    .filter((entry): entry is { label: string; value: string } => entry !== null);
}

function toReadableEventField(key: string, value: unknown): { label: string; value: string } | null {
  if (value === null || value === '') {
    return null;
  }

  if (isDeviceReferenceKey(key) && typeof value === 'number') {
    const device = deviceStore.devices.find((entry) => entry.id === value);
    return {
      label: 'Device',
      value: device ? humanizeDevice(device) : String(value)
    };
  }

  if (key === 'storageLocationId' && typeof value === 'number') {
    const location = referenceStore.storageLocations.find((entry) => entry.id === value);
    return {
      label: 'Storage Location',
      value: location?.label ?? String(value)
    };
  }

  return {
    label: humanizeCode(key),
    value: String(value)
  };
}

function isDeviceReferenceKey(key: string): boolean {
  return /(?:device|receiver)Id$/i.test(key);
}

function goBack(): void {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push('/film');
}

function onChangeFilmState(code: string | null): void {
  eventForm.filmStateCode = code as FilmStateCode | null;
  eventForm.storageLocationId = null;
  eventForm.filmFrameId = null;
  eventForm.deviceId = null;
  eventForm.slotSideNumber = null;
  eventForm.intendedPushPull = null;
  eventForm.labName = '';
  eventForm.labContact = '';
  eventForm.actualPushPull = null;
  eventForm.scannerOrSoftware = '';
  eventForm.scanLink = '';
  eventState.value.fieldErrors = {};
  eventState.value.formError = null;
}

function onChangeDevice(value: number | null): void {
  eventForm.deviceId = value;
  if (!value) {
    eventForm.slotSideNumber = null;
    return;
  }

  const selectedDevice = deviceStore.devices.find((entry) => entry.id === value);
  if (selectedDevice?.deviceTypeCode === 'film_holder') {
    if (
      typeof eventForm.slotSideNumber !== 'number'
      || eventForm.slotSideNumber < 1
      || eventForm.slotSideNumber > selectedDevice.slotCount
    ) {
      eventForm.slotSideNumber = 1;
    }
    return;
  }

  eventForm.slotSideNumber = null;
}

function validateEventForm(): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!eventForm.filmStateCode) {
    errors.filmStateCode = 'Choose a target state.';
  }

  if (!occurredAtTimestamp.value) {
    errors.occurredAt = 'Occurred date and time is required.';
  }

  if (eventForm.filmStateCode === 'stored' && !eventForm.storageLocationId) {
    errors.storageLocationId = 'Select a storage location.';
  }

  if (eventForm.filmStateCode === 'loaded' && !eventForm.deviceId) {
    errors.deviceId = 'Select a device.';
  }
  if (isLargeFormatFilm.value && !eventForm.filmFrameId) {
    errors.filmFrameId = 'Select a frame.';
  }
  if (eventForm.filmStateCode === 'loaded' && eventForm.deviceId) {
    const selectedDevice = deviceStore.devices.find((entry) => entry.id === eventForm.deviceId);
    if (!selectedDevice) {
      errors.deviceId = 'Select a valid device.';
    }
    if (selectedDevice?.deviceTypeCode === 'film_holder') {
      if (typeof eventForm.slotSideNumber !== 'number' || !Number.isInteger(eventForm.slotSideNumber)) {
        errors.slotSideNumber = 'Select a holder slot.';
      } else if (eventForm.slotSideNumber < 1 || eventForm.slotSideNumber > selectedDevice.slotCount) {
        errors.slotSideNumber = `Slot must be between 1 and ${selectedDevice.slotCount}.`;
      }
    }
  }

  return errors;
}

function buildEventData(): Record<string, unknown> {
  switch (eventForm.filmStateCode) {
    case 'stored': {
      const location = referenceStore.storageLocations.find((entry) => entry.id === eventForm.storageLocationId);
      return {
        storageLocationId: eventForm.storageLocationId,
        storageLocationCode: location?.code ?? ''
      };
    }
    case 'loaded':
      {
        const selectedDevice = deviceStore.devices.find((entry) => entry.id === eventForm.deviceId);

        if (!selectedDevice) {
          return {};
        }

        if (selectedDevice.deviceTypeCode === 'camera') {
          return {
            loadTargetType: 'camera_direct',
            ...(isLargeFormatFilm.value ? { filmFrameId: eventForm.filmFrameId } : {}),
            cameraId: selectedDevice.id,
            intendedPushPull: eventForm.intendedPushPull
          };
        }

        if (selectedDevice.deviceTypeCode === 'interchangeable_back') {
          return {
            loadTargetType: 'interchangeable_back',
            ...(isLargeFormatFilm.value ? { filmFrameId: eventForm.filmFrameId } : {}),
            interchangeableBackId: selectedDevice.id,
            intendedPushPull: eventForm.intendedPushPull
          };
        }

        return {
          loadTargetType: 'film_holder_slot',
          ...(isLargeFormatFilm.value ? { filmFrameId: eventForm.filmFrameId } : {}),
          filmHolderId: selectedDevice.id,
          slotNumber: Number(eventForm.slotSideNumber ?? 1),
          intendedPushPull: eventForm.intendedPushPull
        };
      }
    case 'sent_for_dev':
      return {
        labName: eventForm.labName || null,
        labContact: eventForm.labContact || null,
        actualPushPull: eventForm.actualPushPull
      };
    case 'developed':
      return {
        labName: eventForm.labName || null,
        actualPushPull: eventForm.actualPushPull
      };
    case 'scanned':
      return {
        scannerOrSoftware: eventForm.scannerOrSoftware || null,
        scanLink: eventForm.scanLink || null
      };
    default:
      return {};
  }
}

async function submitEvent(): Promise<void> {
  if (isSavingEvent.value || !selectedFilm.value) {
    return;
  }

  eventState.value.fieldErrors = validateEventForm();
  if (Object.keys(eventState.value.fieldErrors).length > 0) {
    eventState.value.formError = 'Please complete required fields before saving.';
    return;
  }

  const payloadBase = {
    occurredAt: new Date(occurredAtTimestamp.value as number).toISOString(),
    notes: eventForm.notes || undefined,
    eventData: buildEventData()
  };

  isSavingEvent.value = true;
  eventState.value.loading = true;
  eventState.value.formError = null;

  try {
    if (isLargeFormatFilm.value) {
      const frameId = eventForm.filmFrameId;
      if (!frameId) {
        throw new Error('Select a frame');
      }
      const payload: CreateFrameJourneyEventRequest = {
        frameStateCode: eventForm.filmStateCode as CreateFrameJourneyEventRequest['frameStateCode'],
        ...payloadBase
      };
      await filmStore.addFrameEvent(selectedFilm.value.id, frameId, payload, createIdempotencyKey());
    } else {
      const payload: CreateFilmJourneyEventRequest = {
        filmStateCode: eventForm.filmStateCode as FilmStateCode,
        ...payloadBase
      };
      await filmStore.addEvent(selectedFilm.value.id, payload, createIdempotencyKey());
    }
    isEventDrawerOpen.value = false;
    feedback.success('Event saved. Timeline updated.');
  } catch (error) {
    eventState.value.formError = feedback.toErrorMessage(error, 'Could not save this event.');
  } finally {
    isSavingEvent.value = false;
    eventState.value.loading = false;
  }
}

onMounted(async () => {
  timelineMediaQuery = window.matchMedia('(max-width: 768px)');
  syncTimelinePlacement(timelineMediaQuery);
  timelineMediaQuery.addEventListener('change', syncTimelinePlacement);

  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
    await deviceStore.loadDevices();
    await filmStore.loadFilm(filmId.value);

    if (route.query.openEvent === '1' && transitions.value.length > 0) {
      isEventDrawerOpen.value = true;
    }
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load film detail.'));
  }
});

onBeforeUnmount(() => {
  timelineMediaQuery?.removeEventListener('change', syncTimelinePlacement);
  timelineMediaQuery = null;
});
</script>

<template>
  <PageShell title="Film Detail" subtitle="Review state history and add the next transition.">
    <template #actions>
      <NButton tertiary @click="goBack">Back</NButton>
      <NButton type="primary" @click="isEventDrawerOpen = true">Add transition event</NButton>
    </template>

    <NAlert v-if="filmStore.detailError" type="error" :show-icon="true" style="margin-bottom: 12px;">
      {{ filmStore.detailError }}
    </NAlert>
    <NAlert v-else-if="selectedFilm && transitions.length === 0" type="warning" :show-icon="true" style="margin-bottom: 12px;">
      No forward transitions are available from the current state.
    </NAlert>

    <NSpin :show="filmStore.isDetailLoading">
      <InventorySplitLayout left-panel-title="Film details" right-panel-title="Journey timeline">
        <template #left>
          <EntityDetailHeaderCard
            v-if="selectedFilm"
            :title="selectedFilm.name"
            :subtitle="`${selectedFilm.filmFormat.code} · ${selectedFilm.packageType.label}`"
            :details="detailItems"
          />
          <NEmpty v-else description="Film not found" />
        </template>

        <template #right>
          <NCard>
            <NTimeline v-if="timelineEvents.length > 0" :item-placement="timelinePlacement" class="film-detail__timeline">
              <NTimelineItem v-for="event in timelineEvents" :key="event.id" :title="event.stateLabel" class="film-detail__timeline-item">
                <template #icon>
                  <span class="film-detail__timeline-dot" :style="{ backgroundColor: event.dotColor }" />
                </template>
                <div class="film-detail__timeline-item-content">
                  <NText depth="3" class="film-detail__timeline-item-date">{{ event.occurredLabel }}</NText>
                  <NText v-if="event.notes" class="film-detail__timeline-item-notes">Notes: {{ event.notes }}</NText>
                  <NText v-for="field in event.detailFields" :key="`${event.id}-${field.label}`" depth="3">
                    {{ field.label }}: {{ field.value }}
                  </NText>
                </div>
              </NTimelineItem>
            </NTimeline>
            <NEmpty v-else-if="!filmStore.isDetailLoading" description="No events yet for this film." />
          </NCard>
        </template>
      </InventorySplitLayout>
    </NSpin>
  </PageShell>

  <NDrawer :show="isEventDrawerOpen" placement="right" width="min(100vw, 460px)" @update:show="(value) => { isEventDrawerOpen = value; }">
    <NDrawerContent title="Add journey event" closable>
      <NForm label-placement="top" @submit.prevent="submitEvent">
        <NAlert v-if="eventState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ eventState.formError }}
        </NAlert>

        <NFormItem
          label="Target state"
          required
          :label-props="{ for: 'event-target-state-input' }"
          :feedback="eventState.fieldErrors.filmStateCode || ''"
        >
          <NSelect
            :value="eventForm.filmStateCode"
            :options="transitions"
            placeholder="Select next state"
            data-testid="event-target-state"
            :input-props="{ id: 'event-target-state-input', name: 'filmStateCode' }"
            @update:value="onChangeFilmState"
          />
        </NFormItem>

        <NFormItem
          label="Occurred at"
          required
          :label-props="{ for: 'event-occurred-at-input' }"
          :feedback="eventState.fieldErrors.occurredAt || ''"
        >
          <NDatePicker
            :value="occurredAtTimestamp"
            type="datetime"
            :input-props="{ id: 'event-occurred-at-input', name: 'occurredAt' }"
            @update:value="(value) => { occurredAtTimestamp = value; }"
          />
        </NFormItem>

        <NFormItem label="Notes" :label-props="{ for: 'event-notes-input' }">
          <NInput
            :value="eventForm.notes"
            type="textarea"
            placeholder="Optional context"
            :input-props="{ id: 'event-notes-input', name: 'notes' }"
            @update:value="(value) => { eventForm.notes = value; }"
          />
        </NFormItem>

        <NText depth="3">
          Fields below change based on the transition state, so only relevant inputs are shown.
        </NText>

        <NFormItem
          v-if="eventForm.filmStateCode === 'stored'"
          label="Storage location"
          required
          :label-props="{ for: 'event-storage-location-input' }"
          :feedback="eventState.fieldErrors.storageLocationId || ''"
        >
          <NSelect
            :value="eventForm.storageLocationId"
            :options="storageLocationOptions"
            placeholder="Select location"
            data-testid="event-storage-location"
            :input-props="{ id: 'event-storage-location-input', name: 'storageLocationId' }"
            @update:value="(value) => { eventForm.storageLocationId = value; }"
          />
        </NFormItem>

        <NFormItem
          v-if="isLargeFormatFilm && eventForm.filmStateCode"
          label="Frame"
          required
          :label-props="{ for: 'event-film-unit-input' }"
          :feedback="eventState.fieldErrors.filmFrameId || ''"
        >
          <NSelect
            :value="eventForm.filmFrameId"
            :options="availableFrameOptions"
            placeholder="Select frame"
            :input-props="{ id: 'event-film-unit-input', name: 'filmFrameId' }"
            @update:value="(value) => { eventForm.filmFrameId = value; }"
          />
        </NFormItem>

        <template v-if="eventForm.filmStateCode === 'loaded'">
          <NFormItem
            label="Device"
            required
            :label-props="{ for: 'event-device-input' }"
            :feedback="eventState.fieldErrors.deviceId || ''"
          >
            <NSelect
              :value="eventForm.deviceId"
              :options="deviceOptions"
              placeholder="Select device"
              :input-props="{ id: 'event-device-input', name: 'deviceId' }"
              @update:value="onChangeDevice"
            />
          </NFormItem>
          <NFormItem
            v-if="selectedLoadDevice?.deviceTypeCode === 'film_holder'"
            label="Holder slot"
            required
            :label-props="{ for: 'event-slot-side-input' }"
            :feedback="eventState.fieldErrors.slotSideNumber || ''"
          >
            <NSelect
              :value="eventForm.slotSideNumber"
              :options="holderSlotOptions"
              placeholder="Select holder slot"
              :input-props="{ id: 'event-slot-side-input', name: 'slotSideNumber' }"
              @update:value="(value) => { eventForm.slotSideNumber = value; }"
            />
          </NFormItem>
          <NFormItem label="Intended push/pull" :label-props="{ for: 'event-intended-push-pull-input' }">
            <NInputNumber
              :value="eventForm.intendedPushPull"
              :input-props="{ id: 'event-intended-push-pull-input', name: 'intendedPushPull' }"
              @update:value="(value) => { eventForm.intendedPushPull = value; }"
            />
          </NFormItem>
        </template>

        <template v-if="eventForm.filmStateCode === 'sent_for_dev'">
          <NFormItem label="Lab name" :label-props="{ for: 'event-lab-name-sent-input' }">
            <NInput
              :value="eventForm.labName"
              :input-props="{ id: 'event-lab-name-sent-input', name: 'labName' }"
              @update:value="(value) => { eventForm.labName = value; }"
            />
          </NFormItem>
          <NFormItem label="Lab contact" :label-props="{ for: 'event-lab-contact-input' }">
            <NInput
              :value="eventForm.labContact"
              :input-props="{ id: 'event-lab-contact-input', name: 'labContact' }"
              @update:value="(value) => { eventForm.labContact = value; }"
            />
          </NFormItem>
          <NFormItem label="Actual push/pull" :label-props="{ for: 'event-actual-push-pull-sent-input' }">
            <NInputNumber
              :value="eventForm.actualPushPull"
              :input-props="{ id: 'event-actual-push-pull-sent-input', name: 'actualPushPull' }"
              @update:value="(value) => { eventForm.actualPushPull = value; }"
            />
          </NFormItem>
        </template>

        <template v-if="eventForm.filmStateCode === 'developed'">
          <NFormItem label="Lab name" :label-props="{ for: 'event-lab-name-developed-input' }">
            <NInput
              :value="eventForm.labName"
              :input-props="{ id: 'event-lab-name-developed-input', name: 'labName' }"
              @update:value="(value) => { eventForm.labName = value; }"
            />
          </NFormItem>
          <NFormItem label="Actual push/pull" :label-props="{ for: 'event-actual-push-pull-developed-input' }">
            <NInputNumber
              :value="eventForm.actualPushPull"
              :input-props="{ id: 'event-actual-push-pull-developed-input', name: 'actualPushPull' }"
              @update:value="(value) => { eventForm.actualPushPull = value; }"
            />
          </NFormItem>
        </template>

        <template v-if="eventForm.filmStateCode === 'scanned'">
          <NFormItem label="Scanner or software" :label-props="{ for: 'event-scanner-software-input' }">
            <NInput
              :value="eventForm.scannerOrSoftware"
              :input-props="{ id: 'event-scanner-software-input', name: 'scannerOrSoftware' }"
              @update:value="(value) => { eventForm.scannerOrSoftware = value; }"
            />
          </NFormItem>
          <NFormItem label="Scan link" :label-props="{ for: 'event-scan-link-input' }">
            <NInput
              :value="eventForm.scanLink"
              :input-props="{ id: 'event-scan-link-input', name: 'scanLink' }"
              @update:value="(value) => { eventForm.scanLink = value; }"
            />
          </NFormItem>
        </template>

        <NFlex justify="end">
          <NButton tertiary @click="isEventDrawerOpen = false">Cancel</NButton>
          <NButton type="primary" attr-type="submit" :loading="isSavingEvent" :disabled="isSavingEvent">
            Save event
          </NButton>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.film-detail__timeline {
  margin-top: 0;
}

.film-detail__timeline-item {
  padding-bottom: 8px;
}

.film-detail__timeline-item-content {
  width: 100%;
}

.film-detail__timeline-item-notes {
  display: block;
  margin: 4px 0;
}

.film-detail__timeline-item-date {
  display: block;
  margin-bottom: 4px;
}

.film-detail__timeline-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

@media (max-width: 768px) {
  .film-detail__timeline-item-content {
    width: 100%;
  }
}
</style>
