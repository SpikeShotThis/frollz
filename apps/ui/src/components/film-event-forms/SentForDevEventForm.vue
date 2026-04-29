<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import type { CreateFilmJourneyEventRequest, ReferenceValueKind } from '@frollz2/schema';
import { z } from 'zod';
import { useReferenceValuesStore } from '../../stores/reference-values.js';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();
const referenceValuesStore = useReferenceValuesStore();

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
const labNameOptions = ref<string[]>([]);
const labContactOptions = ref<string[]>([]);
type QSelectFilterUpdate = (callback: () => void) => void;

async function fetchSuggestions(kind: ReferenceValueKind, term: string): Promise<string[]> {
  try {
    return await referenceValuesStore.loadSuggestions(kind, term);
  } catch {
    return referenceValuesStore.getSuggestions(kind);
  }
}

function onFieldFilter(kind: ReferenceValueKind, target: 'name' | 'contact', value: string, update: QSelectFilterUpdate): void {
  void fetchSuggestions(kind, value).then((items) => {
    update(() => {
      if (target === 'name') labNameOptions.value = items;
      if (target === 'contact') labContactOptions.value = items;
    });
  });
}

function onLabNameFilter(value: string, update: QSelectFilterUpdate): void {
  onFieldFilter('lab_name', 'name', value, update);
}

function onLabContactFilter(value: string, update: QSelectFilterUpdate): void {
  onFieldFilter('lab_contact', 'contact', value, update);
}

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
      <q-select
        :model-value="r$.$value.labName"
        filled
        use-input
        fill-input
        hide-selected
        hide-dropdown-icon
        input-debounce="150"
        :options="labNameOptions"
        label="Lab name (optional)"
        new-value-mode="add-unique"
        :error="r$.labName?.$error"
        :error-message="r$.labName?.$errors[0]"
        @update:model-value="r$.$value.labName = String($event ?? '')"
        @input-value="r$.$value.labName = String($event ?? '')"
        @filter="onLabNameFilter"
      />
    </div>

    <div>
      <q-select
        :model-value="r$.$value.labContact"
        filled
        use-input
        fill-input
        hide-selected
        hide-dropdown-icon
        input-debounce="150"
        :options="labContactOptions"
        label="Lab contact (optional)"
        new-value-mode="add-unique"
        :error="r$.labContact?.$error"
        :error-message="r$.labContact?.$errors[0]"
        @update:model-value="r$.$value.labContact = String($event ?? '')"
        @input-value="r$.$value.labContact = String($event ?? '')"
        @filter="onLabContactFilter"
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
