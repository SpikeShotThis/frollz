<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { createEmulsionRequestSchema } from '@frollz2/schema';
import type { QForm } from 'quasar';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { useReferenceStore } from '../stores/reference.js';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  created: [];
}>();

const referenceStore = useReferenceStore();
const feedback = useUiFeedback();
const isCreating = ref(false);
const emulsionForm = ref<QForm | null>(null);
const idempotencyKey = ref(createIdempotencyKey());

const form = reactive({
  manufacturer: '',
  brand: '',
  isoSpeed: null as number | null,
  developmentProcessId: null as number | null,
  filmFormatIds: [] as number[]
});

const developmentProcessOptions = computed(() =>
  referenceStore.developmentProcesses.map((process) => ({
    label: process.label,
    value: process.id
  }))
);

const filmFormatOptions = computed(() =>
  referenceStore.filmFormats.map((format) => ({
    label: format.label,
    value: format.id
  }))
);

function reset(): void {
  form.manufacturer = '';
  form.brand = '';
  form.isoSpeed = null;
  form.developmentProcessId = null;
  form.filmFormatIds = [];
  idempotencyKey.value = createIdempotencyKey();
}

watch(() => props.modelValue, (open) => {
  if (open) {
    reset();
  }
});

async function submit(): Promise<void> {
  if (isCreating.value) return;

  const result = createEmulsionRequestSchema.safeParse({
    manufacturer: form.manufacturer.trim(),
    brand: form.brand.trim(),
    isoSpeed: Number(form.isoSpeed),
    developmentProcessId: form.developmentProcessId,
    filmFormatIds: form.filmFormatIds
  });

  if (!result.success) {
    feedback.error('Manufacturer, brand, ISO, process, and at least one format are required.');
    return;
  }

  isCreating.value = true;
  try {
    await referenceStore.createEmulsion(result.data, idempotencyKey.value);
    feedback.success('Emulsion created.');
    emit('update:modelValue', false);
    emit('created');
    idempotencyKey.value = createIdempotencyKey();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to create emulsion.'));
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="full-width">
      <q-card-section>
        <div class="text-h6">Create emulsion</div>
      </q-card-section>

      <q-card-section>
        <q-form ref="emulsionForm" class="column q-gutter-md" data-testid="emulsion-create-form" @submit="submit">
          <q-input v-model="form.manufacturer" filled label="Manufacturer" data-testid="emulsion-create-manufacturer" />
          <q-input v-model="form.brand" filled label="Brand" data-testid="emulsion-create-brand" />
          <q-input
            v-model.number="form.isoSpeed"
            filled
            type="number"
            min="1"
            label="ISO"
            data-testid="emulsion-create-iso"
          />
          <q-select
            v-model="form.developmentProcessId"
            filled
            emit-value
            map-options
            :options="developmentProcessOptions"
            label="Development process"
            data-testid="emulsion-create-process"
          />
          <q-select
            v-model="form.filmFormatIds"
            filled
            emit-value
            map-options
            multiple
            :options="filmFormatOptions"
            label="Film formats"
            data-testid="emulsion-create-formats"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="emit('update:modelValue', false)" />
        <q-btn color="primary" label="Create" :loading="isCreating" :disable="isCreating" @click="emulsionForm?.submit()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
