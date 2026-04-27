<script setup lang="ts">
import { reactive } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';
import { z } from 'zod';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();

const form = reactive({
  scannerOrSoftware: '',
  scanLink: '',
});

const scannedSchema = z.object({
  scannerOrSoftware: z.string().optional(),
  scanLink: z.string().optional(),
});

const { r$ } = useRegleSchema(form, scannedSchema);

async function handleSubmit(): Promise<void> {
  if (!props.occurredAt) return;

  const { valid, data } = await r$.$validate();
  if (!valid) return;

  emit('submit', {
    filmStateCode: 'scanned',
    occurredAt: props.occurredAt,
    notes: props.notes || undefined,
    eventData: {
      scannerOrSoftware: data.scannerOrSoftware || null,
      scanLink: data.scanLink || null,
    },
  });
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <div>
      <q-input
        v-model="r$.$value.scannerOrSoftware"
        filled
        label="Scanner/software (optional)"
        :error="r$.scannerOrSoftware?.$error"
        :error-message="r$.scannerOrSoftware?.$errors[0]"
      />
    </div>

    <div>
      <q-input
        v-model="r$.$value.scanLink"
        filled
        label="Scan link (optional)"
        :error="r$.scanLink?.$error"
        :error-message="r$.scanLink?.$errors[0]"
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
