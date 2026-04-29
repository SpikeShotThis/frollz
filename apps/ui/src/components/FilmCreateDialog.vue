<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { QForm } from 'quasar';
import { useRegleSchema } from '@regle/schemas';
import type { FilmCreateForm } from '@frollz2/schema';
import { filmCreateFormSchema } from '@frollz2/schema';
import { useReferenceStore } from '../stores/reference.js';

interface Props {
  isFormatLocked?: boolean;
  lockedFormatFilters?: string[];
  isCreating: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [data: FilmCreateForm] }>();

const isOpen = defineModel<boolean>({ required: true });
const referenceStore = useReferenceStore();
const filmCreateForm = ref<QForm | null>(null);

const form = reactive({
  name: '',
  emulsionId: undefined as number | undefined,
  filmFormatId: undefined as number | undefined,
  packageTypeId: undefined as number | undefined,
  expirationDate: undefined as string | undefined,
});

const { r$ } = useRegleSchema(form, filmCreateFormSchema);

const formatOptions = computed(() => {
  const filters = props.lockedFormatFilters ?? [];
  const base =
    filters.length > 0
      ? referenceStore.filmFormats.filter((f) => filters.includes(f.code))
      : referenceStore.filmFormats;
  return base.map((format) => ({ label: format.label, value: format.id }));
});

const emulsionOptions = computed(() => {
  const formatId = form.filmFormatId;
  const emulsions = formatId
    ? referenceStore.emulsions.filter((e) => e.filmFormats.some((f) => f.id === formatId))
    : referenceStore.emulsions;
  return emulsions.map((emulsion) => ({
    label: `${emulsion.manufacturer} ${emulsion.brand} ISO ${emulsion.isoSpeed}`,
    value: emulsion.id,
  }));
});

const packageTypeOptions = computed(() => {
  if (!form.filmFormatId) return [];
  return referenceStore.packageTypesByFormat(form.filmFormatId).map((pkg) => ({
    label: pkg.label,
    value: pkg.id,
  }));
});

const isEmulsionDisabled = computed(() => form.filmFormatId === null);
const isPackageDisabled = computed(() => form.filmFormatId === null);

watch(
  () => form.filmFormatId,
  () => {
    form.emulsionId = undefined;
    form.packageTypeId = undefined;
  },
);

watch(
  () => isOpen.value,
  (newVal) => {
    if (newVal) {
      form.name = '';
      form.emulsionId = undefined;
      form.filmFormatId = undefined;
      form.packageTypeId = undefined;
      form.expirationDate = undefined;
      const filters = props.lockedFormatFilters ?? [];
      if (props.isFormatLocked && filters.length === 1) {
        const lockedCode = filters[0];
        form.filmFormatId = referenceStore.filmFormats.find((f) => f.code === lockedCode)?.id;
      }
    }
  },
);

async function handleSubmit(): Promise<void> {
  const { valid, data } = await r$.$validate();
  if (valid) {
    emit('submit', data);
  }
}
</script>

<template>
  <q-dialog v-model="isOpen" data-testid="film-create-dialog">
    <q-card class="full-width">
      <q-card-section>
        <div class="text-h6">Create film</div>
      </q-card-section>

      <q-card-section>
        <q-form ref="filmCreateForm" class="column q-gutter-md" data-testid="film-create-form" @submit="handleSubmit">
          <div data-testid="film-create-name">
            <q-input
              v-model="r$.$value.name"
              filled
              label="Film name"
              :error="r$.name.$error"
              :error-message="r$.name.$errors[0]"
            />
          </div>
          <div data-testid="film-create-format">
            <q-select
              v-model="r$.$value.filmFormatId"
              filled
              emit-value
              map-options
              :options="formatOptions"
              :disable="isFormatLocked"
              label="Film format"
              :error="r$.filmFormatId.$error"
              :error-message="r$.filmFormatId.$errors[0]"
            />
          </div>
          <div data-testid="film-create-emulsion">
            <q-select
              v-model="r$.$value.emulsionId"
              filled
              emit-value
              map-options
              :options="emulsionOptions"
              :disable="isEmulsionDisabled"
              label="Emulsion"
              :error="r$.emulsionId.$error"
              :error-message="r$.emulsionId.$errors[0]"
            />
          </div>
          <div data-testid="film-create-package">
            <q-select
              v-model="r$.$value.packageTypeId"
              filled
              emit-value
              map-options
              :options="packageTypeOptions"
              :disable="isPackageDisabled"
              label="Package type"
              :error="r$.packageTypeId.$error"
              :error-message="r$.packageTypeId.$errors[0]"
            />
          </div>
          <div data-testid="film-create-expiration">
            <q-input
              v-model="r$.$value.expirationDate"
              filled
              type="date"
              label="Expiration date (optional)"
              :error="r$.expirationDate?.$error"
              :error-message="r$.expirationDate?.$errors[0]"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Cancel" />
        <q-btn color="primary" label="Create" :loading="isCreating" :disable="isCreating" @click="filmCreateForm?.submit()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
