<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';
import { filmTransitionMap } from '@frollz2/schema';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../composables/idempotency.js';
import PurchasedEventForm from './film-event-forms/PurchasedEventForm.vue';
import StoredEventForm from './film-event-forms/StoredEventForm.vue';
import LoadedEventForm from './film-event-forms/LoadedEventForm.vue';
import ExposedEventForm from './film-event-forms/ExposedEventForm.vue';
import RemovedEventForm from './film-event-forms/RemovedEventForm.vue';
import SentForDevEventForm from './film-event-forms/SentForDevEventForm.vue';
import DevelopedEventForm from './film-event-forms/DevelopedEventForm.vue';
import ScannedEventForm from './film-event-forms/ScannedEventForm.vue';
import ArchivedEventForm from './film-event-forms/ArchivedEventForm.vue';

interface Props {
  currentStateCode: string;
  filmFormatId: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'event-added': [] }>();

type EventPayload = CreateFilmJourneyEventRequest;

const route = useRoute();
const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const feedback = useUiFeedback();

const filmId = computed(() => Number(route.params.id));

const selectedStateCode = ref<string | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const idempotencyKey = ref(createIdempotencyKey());

const form = reactive({
  occurredAt: '',
  notes: '',
});

const validNextStates = computed(() => {
  const nextStateCodes = filmTransitionMap.get(props.currentStateCode) ?? [];
  return nextStateCodes
    .map((code) => referenceStore.filmStates.find((s) => s.code === code))
    .filter((s) => s !== undefined);
});

const subFormComponent = computed(() => {
  const stateMap: Record<string, any> = {
    purchased: PurchasedEventForm,
    stored: StoredEventForm,
    loaded: LoadedEventForm,
    exposed: ExposedEventForm,
    removed: RemovedEventForm,
    sent_for_dev: SentForDevEventForm,
    developed: DevelopedEventForm,
    scanned: ScannedEventForm,
    archived: ArchivedEventForm,
  };
  return selectedStateCode.value ? stateMap[selectedStateCode.value] : null;
});

async function handleSubFormSubmit(payload: EventPayload): Promise<void> {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = null;
  idempotencyKey.value = createIdempotencyKey();

  try {
    // Convert datetime-local (e.g. "2026-04-27T12:20:30") to ISO 8601 with Z                                                                                                      
    const occurredAtIso = `${payload.occurredAt}Z`;
    const enrichedPayload: CreateFilmJourneyEventRequest = {
      ...payload,
      occurredAt: occurredAtIso,
    };

    await filmStore.addEvent(filmId.value, enrichedPayload, idempotencyKey.value);
    feedback.success('Event added.');
    form.occurredAt = '';
    form.notes = '';
    selectedStateCode.value = null;
    emit('event-added');
  } catch (error) {
    errorMessage.value = feedback.toErrorMessage(error, 'Failed to add event.');
  } finally {
    isSubmitting.value = false;
  }
}   
</script>

<template>
  <div class="column q-gutter-md">
    <div v-if="errorMessage" class="q-banner bg-red-1 text-negative rounded">
      {{ errorMessage }}
    </div>

    <div>
      <q-select v-model="selectedStateCode" filled emit-value map-options
        :options="validNextStates.map((s) => ({ label: s.label, value: s.code }))" label="Next state" />
    </div>

    <div v-if="selectedStateCode" class="column q-gutter-md">
      <div>
        <q-input v-model="form.occurredAt" filled type="datetime-local" label="Occurred at" required />
      </div>

      <div>
        <q-input v-model="form.notes" filled type="textarea" label="Notes (optional)" />
      </div>

      <component :is="subFormComponent" :occurred-at="form.occurredAt" :notes="form.notes" :is-submitting="isSubmitting"
        :film-format-id="filmFormatId" @submit="handleSubFormSubmit" />
    </div>
  </div>
</template>
