<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { filmTransitionMap, type FilmFrame, type FilmJourneyEvent } from '@frollz2/schema';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../composables/idempotency.js';

const route = useRoute();
const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const feedback = useUiFeedback();

const filmId = computed(() => Number(route.params.id));
const selectedStateCode = ref<string | null>(null);
const occurredAt = ref(new Date().toISOString().slice(0, 16));
const notes = ref('');
const eventDataJson = ref('{}');
const isSubmitting = ref(false);
const idempotencyKey = ref(createIdempotencyKey());

const allowedNextStates = computed(() => {
  if (!filmStore.currentFilm) {
    return [];
  }

  const nextCodes = filmTransitionMap.get(filmStore.currentFilm.currentStateCode) ?? [];
  return referenceStore.filmStates
    .filter((state) => nextCodes.includes(state.code))
    .map((state) => ({ label: state.label, value: state.code }));
});

const eventColumns = [
  {
    name: 'filmStateCode',
    label: 'State',
    field: 'filmStateCode',
    sortable: true,
    align: 'left'
  },
  {
    name: 'occurredAt',
    label: 'Occurred At',
    field: 'occurredAt',
    sortable: true,
    align: 'left'
  },
  {
    name: 'notes',
    label: 'Notes',
    field: (row: FilmJourneyEvent) => row.notes ?? '',
    align: 'left'
  }
];

const frameColumns = [
  {
    name: 'frameNumber',
    label: 'Frame',
    field: 'frameNumber',
    sortable: true,
    align: 'left'
  },
  {
    name: 'state',
    label: 'State',
    field: 'currentStateCode',
    sortable: true,
    align: 'left'
  },
  {
    name: 'state',
    label: 'State',
    field: (row: FilmFrame) => row.currentStateCode,
    align: 'left'
  }
];

async function load(): Promise<void> {
  if (!Number.isFinite(filmId.value)) {
    return;
  }

  await Promise.allSettled([referenceStore.loadAll(), filmStore.loadFilm(filmId.value)]);
  selectedStateCode.value = allowedNextStates.value[0]?.value ?? null;
}

async function addEvent(): Promise<void> {
  if (!filmStore.currentFilm || !selectedStateCode.value || isSubmitting.value) {
    return;
  }

  let eventData: Record<string, unknown>;

  try {
    const parsed = JSON.parse(eventDataJson.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      feedback.error('Event data must be a JSON object.');
      return;
    }
    eventData = parsed as Record<string, unknown>;
  } catch {
    feedback.error('Event data must be valid JSON.');
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
    eventDataJson.value = '{}';
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
        <q-input v-model="notes" filled type="textarea" label="Notes (optional)" />
        <q-input v-model="eventDataJson" filled type="textarea" label="Event data JSON" autogrow />
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
