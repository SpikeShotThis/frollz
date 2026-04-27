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
  labName: '',
  labContact: '',
  actualPushPull: undefined as number | undefined,
});

const sentForDevSchema = z.object({
  labName: z.string().optional(),
  labContact: z.string().optional(),
  actualPushPull: z.number().int().optional(),
});

const { r$ } = useRegleSchema(form, sentForDevSchema);

async function handleSubmit(): Promise<void> {
  if (!props.occurredAt) return;

  const { valid, data } = await r$.$validate();
  if (!valid) return;

  emit('submit', {
    filmStateCode: 'sent_for_dev',
    occurredAt: props.occurredAt,
    notes: props.notes || undefined,
    eventData: {
      labName: data.labName || null,
      labContact: data.labContact || null,
      actualPushPull: data.actualPushPull ?? null,
    },
  });
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <div>
      <q-input
        v-model="r$.$value.labName"
        filled
        label="Lab name (optional)"
        :error="r$.labName?.$error"
        :error-message="r$.labName?.$errors[0]"
      />
    </div>

    <div>
      <q-input
        v-model="r$.$value.labContact"
        filled
        label="Lab contact (optional)"
        :error="r$.labContact?.$error"
        :error-message="r$.labContact?.$errors[0]"
      />
    </div>

    <div>
      <q-input
        v-model.number="r$.$value.actualPushPull"
        filled
        type="number"
        label="Actual push/pull (optional)"
        :error="r$.actualPushPull?.$error"
        :error-message="r$.actualPushPull?.$errors[0]"
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
