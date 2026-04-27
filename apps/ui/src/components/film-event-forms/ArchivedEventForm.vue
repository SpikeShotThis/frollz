<script setup lang="ts">
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();

function handleSubmit(): void {
  if (!props.occurredAt) return;

  emit('submit', {
    filmStateCode: 'archived',
    occurredAt: props.occurredAt,
    notes: props.notes || undefined,
    eventData: {},
  });
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <q-btn
      type="submit"
      color="primary"
      label="Add Event"
      :loading="isSubmitting"
    />
  </q-form>
</template>
