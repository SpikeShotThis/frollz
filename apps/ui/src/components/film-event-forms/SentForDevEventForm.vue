<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
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
});

const sentForDevSchema = z.object({
  labId: z.number().int().positive(),
  actualPushPull: z.number().int().optional(),
});

const { r$ } = useRegleSchema(form, sentForDevSchema);
const creatingLab = ref(false);
const labOptions = computed(() =>
  filmLabsStore.filmLabs.filter((lab) => lab.active).map((lab) => ({ label: lab.name, value: lab.id }))
);

onMounted(async () => {
  await filmLabsStore.loadFilmLabs();
  const firstLab = filmLabsStore.filmLabs.find((lab) => lab.active);
  if (firstLab && !r$.$value.labId) {
    r$.$value.labId = firstLab.id;
  }
});

async function createLabInline(newName: string, done: (value?: unknown, mode?: 'add' | 'add-unique' | 'toggle') => void): Promise<void> {
  const name = newName.trim();
  if (!name || creatingLab.value) {
    done();
    return;
  }

  creatingLab.value = true;
  try {
    const created = await filmLabsStore.createFilmLab({ name });
    r$.$value.labId = created.id;
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
    },
  });
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <div>
      <q-select
        :model-value="r$.$value.labId"
        filled
        emit-value
        map-options
        use-input
        fill-input
        hide-selected
        input-debounce="0"
        :options="labOptions"
        label="Lab"
        :loading="creatingLab"
        :error="r$.labId?.$error"
        :error-message="r$.labId?.$errors[0]"
        @new-value="createLabInline"
        @update:model-value="r$.$value.labId = Number($event)"
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
