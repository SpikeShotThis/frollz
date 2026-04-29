<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';
import { z } from 'zod';
import { useFilmLabsStore } from '../../stores/film-labs.js';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();
const filmLabsStore = useFilmLabsStore();

const form = reactive({
  labId: undefined as number | undefined,
  actualPushPull: undefined as number | undefined,
});

const developedSchema = z.object({
  labId: z.number().int().positive(),
  actualPushPull: z.number().int().optional(),
});

const { r$ } = useRegleSchema(form, developedSchema);
const quickCreateName = ref('');
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

async function quickCreateLab(): Promise<void> {
  if (!quickCreateName.value.trim() || creatingLab.value) return;
  creatingLab.value = true;
  try {
    const created = await filmLabsStore.createFilmLab({ name: quickCreateName.value.trim() });
    r$.$value.labId = created.id;
    quickCreateName.value = '';
  } finally {
    creatingLab.value = false;
  }
}

async function handleSubmit(): Promise<void> {
  if (!props.occurredAt) return;

  const { valid, data } = await r$.$validate();
  if (!valid) return;

  emit('submit', {
    filmStateCode: 'developed',
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
        :options="labOptions"
        label="Lab"
        :error="r$.labId?.$error"
        :error-message="r$.labId?.$errors[0]"
        @update:model-value="r$.$value.labId = Number($event)"
      />
    </div>

    <div class="row q-gutter-sm items-center">
      <q-input v-model="quickCreateName" filled label="Quick add lab name" class="col" />
      <q-btn color="secondary" label="Create" :loading="creatingLab" :disable="!quickCreateName.trim()" @click="quickCreateLab" />
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
