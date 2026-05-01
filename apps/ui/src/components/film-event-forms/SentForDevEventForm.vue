<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';
import { z } from 'zod';
import { useFilmLabsStore } from '../../stores/film-labs.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();
const filmLabsStore = useFilmLabsStore();
const feedback = useUiFeedback();

const form = reactive({
  labId: undefined as number | undefined,
  actualPushPull: undefined as number | undefined,
  costAmount: undefined as number | undefined,
  costCurrencyCode: 'USD' as string,
});

const sentForDevSchema = z.object({
  labId: z.number().int().positive(),
  actualPushPull: z.number().int().optional(),
  costAmount: z.number().nonnegative().optional(),
  costCurrencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
});

const { r$ } = useRegleSchema(form, sentForDevSchema);
const creatingLab = ref(false);

type LabOption = { label: string; value: number };

const labOptions = computed(() =>
  filmLabsStore.filmLabs.filter((lab) => lab.active).map((lab) => ({ label: lab.name, value: lab.id }))
);
const labModel = ref<LabOption | null>(null);
const filteredLabOptions = ref<LabOption[]>([]);

watch(labOptions, (opts) => { filteredLabOptions.value = opts; }, { immediate: true });
watch(labModel, (selected) => { r$.$value.labId = selected?.value as number; });

onMounted(async () => {
  await filmLabsStore.loadFilmLabs();
  const firstLab = filmLabsStore.filmLabs.find((lab) => lab.active);
  if (firstLab && !labModel.value) {
    labModel.value = { label: firstLab.name, value: firstLab.id };
  }
});

function onLabFilter(val: string, update: (fn: () => void) => void): void {
  update(() => {
    const needle = val.toLowerCase();
    filteredLabOptions.value = needle === ''
      ? labOptions.value
      : labOptions.value.filter((opt) => opt.label.toLowerCase().includes(needle));
  });
}

async function createLabInline(newName: string, done: (value?: unknown) => void): Promise<void> {
  const name = newName.trim();
  if (!name || creatingLab.value) {
    done();
    return;
  }

  creatingLab.value = true;
  try {
    const created = await filmLabsStore.createFilmLab({ name });
    labModel.value = { label: created.name, value: created.id };
    feedback.success('Lab created.');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to create lab.'));
  } finally {
    creatingLab.value = false;
    done();
  }
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
      labId: data.labId,
      actualPushPull: data.actualPushPull ?? null,
      cost: data.costAmount != null
        ? {
          amount: data.costAmount,
          currencyCode: (data.costCurrencyCode ?? 'USD').toUpperCase()
        }
        : null
    },
  });
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <div>
      <q-select
        v-model="labModel"
        filled
        use-input
        fill-input
        hide-selected
        input-debounce="0"
        :options="filteredLabOptions"
        label="Lab"
        :loading="creatingLab"
        :disable="isSubmitting || creatingLab"
        :error="r$.labId?.$error"
        :error-message="r$.labId?.$errors[0]"
        @new-value="createLabInline"
        @filter="onLabFilter"
      />
    </div>

    <div>
      <q-input
        v-model.number="r$.$value.actualPushPull"
        filled
        type="number"
        label="Actual push/pull (optional)"
        :disable="isSubmitting"
        :error="r$.actualPushPull?.$error"
        :error-message="r$.actualPushPull?.$errors[0]"
      />
    </div>
    <div>
      <q-input
        v-model.number="r$.$value.costAmount"
        filled
        type="number"
        min="0"
        step="0.01"
        label="Development cost (optional)"
        :disable="isSubmitting"
        :error="r$.costAmount?.$error"
        :error-message="r$.costAmount?.$errors[0]"
      />
    </div>
    <div>
      <q-input
        v-model="r$.$value.costCurrencyCode"
        filled
        label="Cost currency (optional, e.g. USD)"
        :disable="isSubmitting"
        :error="r$.costCurrencyCode?.$error"
        :error-message="r$.costCurrencyCode?.$errors[0]"
      />
    </div>

    <q-btn
      type="submit"
      color="primary"
      label="Add Event"
      :loading="isSubmitting"
      :disable="isSubmitting || creatingLab"
    />
  </q-form>
</template>
