<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { createEmulsionRequestSchema, type ReferenceValueKind } from '@frollz2/schema';
import type { QForm } from 'quasar';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { useEmulsionStore } from '../stores/emulsions.js';
import { useReferenceStore } from '../stores/reference.js';
import { useReferenceValuesStore } from '../stores/reference-values.js';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  created: [];
}>();

const referenceStore = useReferenceStore();
const referenceValuesStore = useReferenceValuesStore();
const emulsionStore = useEmulsionStore();
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

const manufacturerOptions = ref<string[]>([]);
const brandOptions = ref<string[]>([]);

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

async function fetchSuggestions(kind: ReferenceValueKind, term: string): Promise<string[]> {
  try {
    return await referenceValuesStore.loadSuggestions(kind, term);
  } catch {
    return referenceValuesStore.getSuggestions(kind);
  }
}

function onManufacturerFilter(value: string, update: (callback: () => void) => void): void {
  void fetchSuggestions('manufacturer', value).then((items) => {
    update(() => {
      manufacturerOptions.value = items;
      const normalized = value.toLowerCase();
      const match = items.find((item) => item.toLowerCase() === normalized);
      if (match !== undefined && match !== value) {
        form.manufacturer = match;
      }
    });
  });
}

function onBrandFilter(value: string, update: (callback: () => void) => void): void {
  void fetchSuggestions('brand', value).then((items) => {
    update(() => {
      brandOptions.value = items;
      const normalized = value.toLowerCase();
      const match = items.find((item) => item.toLowerCase() === normalized);
      if (match !== undefined && match !== value) {
        form.brand = match;
      }
    });
  });
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
    await emulsionStore.createEmulsion(result.data, idempotencyKey.value);
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
          <q-select
            :model-value="form.manufacturer"
            filled
            use-input
            fill-input
            hide-selected
            hide-dropdown-icon
            input-debounce="150"
            :options="manufacturerOptions"
            label="Manufacturer"
            new-value-mode="add-unique"
            data-testid="emulsion-create-manufacturer"
            @update:model-value="form.manufacturer = String($event ?? '')"
            @input-value="form.manufacturer = String($event ?? '')"
            @filter="onManufacturerFilter"
          />
          <q-select
            :model-value="form.brand"
            filled
            use-input
            fill-input
            hide-selected
            hide-dropdown-icon
            input-debounce="150"
            :options="brandOptions"
            label="Brand"
            new-value-mode="add-unique"
            data-testid="emulsion-create-brand"
            @update:model-value="form.brand = String($event ?? '')"
            @input-value="form.brand = String($event ?? '')"
            @filter="onBrandFilter"
          />
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
