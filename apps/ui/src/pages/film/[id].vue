<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { filmTransitionMap, type FilmFrame, type FilmJourneyEvent } from '@frollz2/schema';
import { useFilmStore } from '../../stores/film.js';
import { useReferenceStore } from '../../stores/reference.js';
import { useDeviceStore } from '../../stores/devices.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../../composables/idempotency.js';

const route = useRoute();
const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();
const feedback = useUiFeedback();

const filmId = computed(() => Number(route.params.id));
const selectedStateCode = ref<string | null>(null);
const occurredAt = ref(new Date().toISOString().slice(0, 16));
const notes = ref('');
const isSubmitting = ref(false);
const idempotencyKey = ref(createIdempotencyKey());

// State-specific form fields
const storedLocationId = ref<number | null>(null);
const loadedDeviceId = ref<number | null>(null);
const loadedSlotNumber = ref<1 | 2 | null>(null);
const loadedPushPull = ref<number | null>(null);
const sentLabName = ref('');
const sentLabContact = ref('');
const sentActualPushPull = ref<number | null>(null);
const developedLabName = ref('');
const developedActualPushPull = ref<number | null>(null);
const scannedScanner = ref('');
const scannedScanLink = ref('');

const allowedNextStates = computed(() => {
  if (!filmStore.currentFilm) {
    return [];
  }

  const nextCodes = filmTransitionMap.get(filmStore.currentFilm.currentStateCode) ?? [];
  return referenceStore.filmStates
    .filter((state) => nextCodes.includes(state.code))
    .map((state) => ({ label: state.label, value: state.code }));
});

const storageLocationOptions = computed(() =>
  referenceStore.storageLocations.map((loc) => ({ label: loc.label, value: loc.id }))
);

const compatibleDevices = computed(() => {
  if (!filmStore.currentFilm) return [];
  const formatId = filmStore.currentFilm.filmFormatId;
  return deviceStore.devices
    .filter((d) => d.filmFormatId === formatId)
    .map((d) => {
      let label = '';
      if (d.deviceTypeCode === 'camera') label = `${d.make} ${d.model}`;
      else if (d.deviceTypeCode === 'interchangeable_back') label = `${d.name} (${d.system})`;
      else label = `${d.name} — ${d.brand}`;
      return { label, value: d.id };
    });
});

const selectedDevice = computed(() =>
  deviceStore.devices.find((d) => d.id === loadedDeviceId.value) ?? null
);

const isFilmHolder = computed(() =>
  selectedDevice.value?.deviceTypeCode === 'film_holder'
);

const holderSlotOptions = computed(() => {
  const device = selectedDevice.value;
  if (!device || device.deviceTypeCode !== 'film_holder') return [];
  return Array.from({ length: device.slotCount }, (_, i) => ({
    label: `Slot ${i + 1}`,
    value: (i + 1) as 1 | 2
  }));
});

const eventColumns = [
  { name: 'filmStateCode', label: 'State', field: 'filmStateCode', sortable: true, align: 'left' as const },
  { name: 'occurredAt', label: 'Occurred At', field: 'occurredAt', sortable: true, align: 'left' as const },
  { name: 'notes', label: 'Notes / Data', field: (row: FilmJourneyEvent) => row.notes ?? '', align: 'left' as const }
];

const frameColumns = [
  { name: 'frameNumber', label: 'Frame', field: 'frameNumber', sortable: true, align: 'left' as const },
  { name: 'state', label: 'State', field: (row: FilmFrame) => row.currentStateCode, align: 'left' as const }
];

function buildEventData(): Record<string, unknown> | null {
  switch (selectedStateCode.value) {
    case 'stored': {
      const loc = referenceStore.storageLocations.find((l) => l.id === storedLocationId.value);
      if (!loc) return null;
      return { storageLocationId: loc.id, storageLocationCode: loc.code };
    }
    case 'loaded': {
      const device = selectedDevice.value;
      if (!device) return null;
      if (device.deviceTypeCode === 'camera') {
        return { loadTargetType: 'camera_direct', cameraId: device.id, intendedPushPull: loadedPushPull.value ?? null };
      }
      if (device.deviceTypeCode === 'interchangeable_back') {
        return { loadTargetType: 'interchangeable_back', interchangeableBackId: device.id, intendedPushPull: loadedPushPull.value ?? null };
      }
      if (!loadedSlotNumber.value) return null;
      return { loadTargetType: 'film_holder_slot', filmHolderId: device.id, slotNumber: loadedSlotNumber.value, intendedPushPull: loadedPushPull.value ?? null };
    }
    case 'sent_for_dev':
      return { labName: sentLabName.value.trim() || null, labContact: sentLabContact.value.trim() || null, actualPushPull: sentActualPushPull.value ?? null };
    case 'developed':
      return { labName: developedLabName.value.trim() || null, actualPushPull: developedActualPushPull.value ?? null };
    case 'scanned':
      return { scannerOrSoftware: scannedScanner.value.trim() || null, scanLink: scannedScanLink.value.trim() || null };
    default:
      return {};
  }
}

function resetEventFields(): void {
  storedLocationId.value = null;
  loadedDeviceId.value = null;
  loadedSlotNumber.value = null;
  loadedPushPull.value = null;
  sentLabName.value = '';
  sentLabContact.value = '';
  sentActualPushPull.value = null;
  developedLabName.value = '';
  developedActualPushPull.value = null;
  scannedScanner.value = '';
  scannedScanLink.value = '';
}

async function load(): Promise<void> {
  if (!Number.isFinite(filmId.value)) {
    return;
  }

  await Promise.allSettled([referenceStore.loadAll(), filmStore.loadFilm(filmId.value), deviceStore.loadDevices()]);
  selectedStateCode.value = allowedNextStates.value[0]?.value ?? null;
}

async function addEvent(): Promise<void> {
  if (!filmStore.currentFilm || !selectedStateCode.value || isSubmitting.value) {
    return;
  }

  const eventData = buildEventData();
  if (eventData === null) {
    feedback.error('Please fill in all required fields for this transition.');
    return;
  }

  isSubmitting.value = true;
  try {
    await filmStore.addEvent(
      filmStore.currentFilm.id,
      {
        filmStateCode: selectedStateCode.value,
        occurredAt: new Date(occurredAt.value).toISOString(),
        notes: notes.value.trim() || undefined,
        eventData
      },
      idempotencyKey.value
    );
    feedback.success('Film event recorded.');
    notes.value = '';
    resetEventFields();
    idempotencyKey.value = createIdempotencyKey();
    selectedStateCode.value = allowedNextStates.value[0]?.value ?? null;
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to record event.'));
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(load);
watch(filmId, load);
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <q-btn flat color="primary" icon="arrow_back" label="Back to film" to="/film" class="self-start" />

    <q-banner v-if="filmStore.detailError" class="bg-red-1 text-negative" rounded>
      {{ filmStore.detailError }}
    </q-banner>

    <q-card v-if="filmStore.currentFilm" flat bordered>
      <q-card-section>
        <div class="text-h5">{{ filmStore.currentFilm.name }}</div>
        <div class="text-subtitle2 text-grey-7">
          {{ filmStore.currentFilm.emulsion.manufacturer }} {{ filmStore.currentFilm.emulsion.brand }} ·
          {{ filmStore.currentFilm.filmFormat.label }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-md-6"><span class="text-grey-7">Current state:</span> {{ filmStore.currentFilm.currentState.label }}</div>
        <div class="col-12 col-md-6">
          <span class="text-grey-7">Expiration:</span>
          {{ filmStore.currentFilm.expirationDate ? new Date(filmStore.currentFilm.expirationDate).toLocaleDateString() : 'N/A' }}
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="filmStore.currentFilm" flat bordered>
      <q-card-section>
        <div class="text-subtitle1">Add transition event</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="column q-gutter-md">
        <q-select
          v-model="selectedStateCode"
          filled
          emit-value
          map-options
          :options="allowedNextStates"
          label="Next state"
        />
        <q-input v-model="occurredAt" filled type="datetime-local" label="Occurred at" />
        <q-input v-model="notes" filled type="textarea" label="Notes (optional)" autogrow />

        <!-- stored: pick storage location -->
        <template v-if="selectedStateCode === 'stored'">
          <q-select
            v-model="storedLocationId"
            filled
            emit-value
            map-options
            :options="storageLocationOptions"
            label="Storage location"
          />
        </template>

        <!-- loaded: pick device, optional slot + push/pull -->
        <template v-else-if="selectedStateCode === 'loaded'">
          <q-select
            v-model="loadedDeviceId"
            filled
            emit-value
            map-options
            :options="compatibleDevices"
            label="Device"
          />
          <q-select
            v-if="isFilmHolder"
            v-model="loadedSlotNumber"
            filled
            emit-value
            map-options
            :options="holderSlotOptions"
            label="Slot"
          />
          <q-input
            v-model.number="loadedPushPull"
            filled
            type="number"
            label="Intended push/pull (optional)"
            clearable
          />
        </template>

        <!-- sent_for_dev: lab info + push/pull -->
        <template v-else-if="selectedStateCode === 'sent_for_dev'">
          <q-input v-model="sentLabName" filled label="Lab name (optional)" />
          <q-input v-model="sentLabContact" filled label="Lab contact (optional)" />
          <q-input v-model.number="sentActualPushPull" filled type="number" label="Actual push/pull (optional)" clearable />
        </template>

        <!-- developed: lab name + push/pull -->
        <template v-else-if="selectedStateCode === 'developed'">
          <q-input v-model="developedLabName" filled label="Lab name (optional)" />
          <q-input v-model.number="developedActualPushPull" filled type="number" label="Actual push/pull (optional)" clearable />
        </template>

        <!-- scanned: scanner + link -->
        <template v-else-if="selectedStateCode === 'scanned'">
          <q-input v-model="scannedScanner" filled label="Scanner or software (optional)" />
          <q-input v-model="scannedScanLink" filled label="Scan link (optional)" />
        </template>

        <div>
          <q-btn color="primary" label="Record event" :loading="isSubmitting" :disable="!selectedStateCode" @click="addEvent" />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section class="text-subtitle1">Journey events</q-card-section>
      <q-separator />
      <q-card-section>
        <q-table
          :rows="filmStore.currentEvents"
          :columns="eventColumns"
          row-key="id"
          flat
          bordered
          :loading="filmStore.isDetailLoading"
        >
          <template #body-cell-notes="props">
            <q-td :props="props">
              {{ props.row.notes || JSON.stringify(props.row.eventData) }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section class="text-subtitle1">Frames</q-card-section>
      <q-separator />
      <q-card-section>
        <q-table :rows="filmStore.currentFrames" :columns="frameColumns" row-key="id" flat bordered :loading="filmStore.isDetailLoading" />
      </q-card-section>
    </q-card>
  </q-page>
</template>
