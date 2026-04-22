<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTag,
  NText
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { CreateFilmJourneyEventRequest, FilmJourneyEvent } from '@frollz2/schema';
import { filmTransitionMap } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';
import { useDeviceStore } from '../stores/devices.js';
import PageShell from '../components/PageShell.vue';
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

const selectedFilm = computed(() => filmStore.currentFilm);
const transitions = computed<Array<{ label: string; value: FilmStateCode }>>(() => {
  const current = selectedFilm.value?.currentStateCode;
  if (!current) {
    return [];
  }

  const allowed = filmTransitionMap.get(current) ?? [];
  return referenceStore.filmStates
    .filter((state) => allowed.includes(state.code))
    .map((state) => ({ label: state.label, value: state.code }));
});

const storageLocationOptions = computed(() =>
  referenceStore.storageLocations.map((location) => ({ label: location.label, value: location.id }))
);

const deviceOptions = computed(() =>
  deviceStore.devices
    .filter((device) => selectedFilm.value && device.filmFormatId === selectedFilm.value.filmFormatId)
    .map((device) => ({
      label:
        device.deviceTypeCode === 'camera'
          ? `${device.make} ${device.model}`
          : device.deviceTypeCode === 'interchangeable_back'
            ? `${device.name} ${device.system}`
            : `${device.name} ${device.brand}`,
      value: device.id
    }))
);

const eventsColumns = computed<DataTableColumns<FilmJourneyEvent>>(() => [
  {
    title: 'State',
    key: 'filmStateCode',
    render: (row) => h(NTag, { type: stateTypeByCode[row.filmStateCode] ?? 'default' }, { default: () => humanizeCode(row.filmStateCode) })
  },
  {
    title: 'Occurred',
    key: 'occurredAt',
    render: (row) => formatDateTime(row.occurredAt)
  },
  {
    title: 'Details',
    key: 'eventData',
    render: (row) => eventDataSummary(row)
  },
  { title: 'Notes', key: 'notes', render: (row) => row.notes ?? '-' }
]);

function humanizeCode(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
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
  const entries = Object.entries(event.eventData)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => `${humanizeCode(key)}: ${String(value)}`);

  return entries.length > 0 ? entries.join(' | ') : '-';
}

function onChangeFilmState(code: string | null): void {
  eventForm.filmStateCode = code as FilmStateCode | null;
  eventForm.storageLocationId = null;
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
      return {
        deviceId: eventForm.deviceId,
        slotSideNumber: eventForm.slotSideNumber,
        intendedPushPull: eventForm.intendedPushPull
      };
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

  const payload: CreateFilmJourneyEventRequest = {
    filmStateCode: eventForm.filmStateCode as FilmStateCode,
    occurredAt: new Date(occurredAtTimestamp.value as number).toISOString(),
    notes: eventForm.notes || undefined,
    eventData: buildEventData()
  };

  isSavingEvent.value = true;
  eventState.value.loading = true;
  eventState.value.formError = null;

  try {
    await filmStore.addEvent(selectedFilm.value.id, payload, createIdempotencyKey());
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
</script>

<template>
  <PageShell title="Film Detail" subtitle="Review state history and add the next transition.">
    <template #actions>
      <NButton tertiary @click="router.push('/film')">Back to inventory</NButton>
      <NButton type="primary" @click="isEventDrawerOpen = true">Add transition event</NButton>
    </template>

    <NCard>
      <NAlert v-if="filmStore.detailError" type="error" :show-icon="true" style="margin-bottom: 12px;">
        {{ filmStore.detailError }}
      </NAlert>
      <NAlert v-else-if="selectedFilm && transitions.length === 0" type="warning" :show-icon="true" style="margin-bottom: 12px;">
        No forward transitions are available from the current state.
      </NAlert>
      <template v-if="selectedFilm">
        <NFlex vertical size="small">
          <NText strong>{{ selectedFilm.name }}</NText>
          <NTag :type="stateTypeByCode[selectedFilm.currentStateCode] ?? 'default'">{{ selectedFilm.currentState.label }}</NTag>
          <NDescriptions label-placement="top" :column="3" bordered size="small">
            <NDescriptionsItem label="Emulsion">
              {{ selectedFilm.emulsion.manufacturer }} {{ selectedFilm.emulsion.brand }} {{ selectedFilm.emulsion.isoSpeed }}
            </NDescriptionsItem>
            <NDescriptionsItem label="Format">{{ selectedFilm.filmFormat.code }}</NDescriptionsItem>
            <NDescriptionsItem label="Package">{{ selectedFilm.packageType.code }}</NDescriptionsItem>
            <NDescriptionsItem v-if="selectedFilm.expirationDate" label="Expiration">
              {{ formatDateTime(selectedFilm.expirationDate) }}
            </NDescriptionsItem>
          </NDescriptions>
        </NFlex>
      </template>
      <NEmpty v-else description="Film not found" />
    </NCard>

    <NCard title="Journey timeline">
      <NDataTable :columns="eventsColumns" :data="filmStore.currentEvents" :loading="filmStore.isDetailLoading" :row-key="(row) => row.id" />
      <NEmpty v-if="!filmStore.isDetailLoading && filmStore.currentEvents.length === 0" description="No events yet for this film." />
    </NCard>
  </PageShell>

  <NDrawer :show="isEventDrawerOpen" placement="right" width="460" @update:show="(value) => { isEventDrawerOpen = value; }">
    <NDrawerContent title="Add journey event" closable>
      <NForm label-placement="top" @submit.prevent="submitEvent">
        <NAlert v-if="eventState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ eventState.formError }}
        </NAlert>

        <NFormItem
          label="Target state"
          required
          :feedback="eventState.fieldErrors.filmStateCode || ''"
        >
          <NSelect
            :value="eventForm.filmStateCode"
            :options="transitions"
            placeholder="Select next state"
            data-testid="event-target-state"
            @update:value="onChangeFilmState"
          />
        </NFormItem>

        <NFormItem
          label="Occurred at"
          required
          :feedback="eventState.fieldErrors.occurredAt || ''"
        >
          <NDatePicker :value="occurredAtTimestamp" type="datetime" @update:value="(value) => { occurredAtTimestamp = value; }" />
        </NFormItem>

        <NFormItem label="Notes">
          <NInput :value="eventForm.notes" type="textarea" placeholder="Optional context" @update:value="(value) => { eventForm.notes = value; }" />
        </NFormItem>

        <NText depth="3">
          Fields below change based on the transition state, so only relevant inputs are shown.
        </NText>

        <NFormItem
          v-if="eventForm.filmStateCode === 'stored'"
          label="Storage location"
          required
          :feedback="eventState.fieldErrors.storageLocationId || ''"
        >
          <NSelect
            :value="eventForm.storageLocationId"
            :options="storageLocationOptions"
            placeholder="Select location"
            data-testid="event-storage-location"
            @update:value="(value) => { eventForm.storageLocationId = value; }"
          />
        </NFormItem>

        <template v-if="eventForm.filmStateCode === 'loaded'">
          <NFormItem
            label="Device"
            required
            :feedback="eventState.fieldErrors.deviceId || ''"
          >
            <NSelect :value="eventForm.deviceId" :options="deviceOptions" placeholder="Select device" @update:value="(value) => { eventForm.deviceId = value; }" />
          </NFormItem>
          <NFormItem label="Holder slot side (holders only)">
            <NInputNumber :value="eventForm.slotSideNumber" @update:value="(value) => { eventForm.slotSideNumber = value; }" />
          </NFormItem>
          <NFormItem label="Intended push/pull">
            <NInputNumber :value="eventForm.intendedPushPull" @update:value="(value) => { eventForm.intendedPushPull = value; }" />
          </NFormItem>
        </template>

        <template v-if="eventForm.filmStateCode === 'sent_for_dev'">
          <NFormItem label="Lab name">
            <NInput :value="eventForm.labName" @update:value="(value) => { eventForm.labName = value; }" />
          </NFormItem>
          <NFormItem label="Lab contact">
            <NInput :value="eventForm.labContact" @update:value="(value) => { eventForm.labContact = value; }" />
          </NFormItem>
          <NFormItem label="Actual push/pull">
            <NInputNumber :value="eventForm.actualPushPull" @update:value="(value) => { eventForm.actualPushPull = value; }" />
          </NFormItem>
        </template>

        <template v-if="eventForm.filmStateCode === 'developed'">
          <NFormItem label="Lab name">
            <NInput :value="eventForm.labName" @update:value="(value) => { eventForm.labName = value; }" />
          </NFormItem>
          <NFormItem label="Actual push/pull">
            <NInputNumber :value="eventForm.actualPushPull" @update:value="(value) => { eventForm.actualPushPull = value; }" />
          </NFormItem>
        </template>

        <template v-if="eventForm.filmStateCode === 'scanned'">
          <NFormItem label="Scanner or software">
            <NInput :value="eventForm.scannerOrSoftware" @update:value="(value) => { eventForm.scannerOrSoftware = value; }" />
          </NFormItem>
          <NFormItem label="Scan link">
            <NInput :value="eventForm.scanLink" @update:value="(value) => { eventForm.scanLink = value; }" />
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
