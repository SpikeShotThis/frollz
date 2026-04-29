<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';
import { z } from 'zod';
import { idSchema } from '@frollz2/schema';
import { useReferenceStore } from '../../stores/reference.js';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();

const referenceStore = useReferenceStore();

const form = reactive({
  storageLocationId: undefined as number | undefined,
});

const storageLocationSchema = z.object({
  storageLocationId: idSchema,
});

const { r$ } = useRegleSchema(form, storageLocationSchema);

const storageLocationOptions = computed(() =>
  referenceStore.storageLocations.map((loc) => ({
    label: loc.label,
    value: loc.id,
  }))
);

async function handleSubmit(): Promise<void> {
  if (!props.occurredAt) return;

  const { valid, data } = await r$.$validate();
  if (!valid) return;

  const storageLocation = referenceStore.storageLocations.find(
    (loc) => loc.id === data.storageLocationId
  );
  if (!storageLocation) return;

  emit('submit', {
    filmStateCode: 'stored',
    occurredAt: props.occurredAt,
    notes: props.notes || undefined,
    eventData: {
      storageLocationId: data.storageLocationId,
      storageLocationCode: storageLocation.code,
    },
  });
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <div>
      <q-select
        v-model="r$.$value.storageLocationId"
        filled
        emit-value
        map-options
        :options="storageLocationOptions"
        label="Storage location"
        :error="r$.storageLocationId.$error"
        :error-message="r$.storageLocationId.$errors[0]"
      />
    </div>

    <q-btn
      type="submit"
      color="primary"
      label="Add Event"
      :loading="isSubmitting"
    />
  </q-form>
</template>
