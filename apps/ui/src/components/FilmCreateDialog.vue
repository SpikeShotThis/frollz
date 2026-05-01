<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { currentDateLocal } from '../composables/dateDefaults.js';
import type { QForm } from 'quasar';
import { useRegleSchema } from '@regle/schemas';
import type { FilmCreateForm } from '@frollz2/schema';
import { filmCreateFormSchema } from '@frollz2/schema';
import { useReferenceStore } from '../stores/reference.js';
import { useEmulsionStore } from '../stores/emulsions.js';
import { useFilmSuppliersStore } from '../stores/film-suppliers.js';

interface Props {
  isFormatLocked?: boolean;
  lockedFormatFilters?: string[];
  isCreating: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [data: FilmCreateForm] }>();

const isOpen = defineModel<boolean>({ required: true });
const referenceStore = useReferenceStore();
const emulsionStore = useEmulsionStore();
const filmSuppliersStore = useFilmSuppliersStore();
const filmCreateForm = ref<QForm | null>(null);

const form = reactive({
  name: '',
  emulsionId: undefined as number | undefined,
  filmFormatId: undefined as number | undefined,
  packageTypeId: undefined as number | undefined,
  expirationDate: currentDateLocal() as string | undefined,
  supplierName: '' as string,
  purchaseInfo: {
    supplierId: undefined as number | undefined,
    channel: '' as string,
    price: undefined as number | undefined,
    currencyCode: 'USD' as string,
    orderRef: '' as string,
    obtainedDate: currentDateLocal() as string | undefined
  },
  rating: undefined as number | undefined
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
    ? emulsionStore.emulsions.filter((e) => e.filmFormats.some((f) => f.id === formatId))
    : emulsionStore.emulsions;
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
const supplierOptions = computed(() =>
  filmSuppliersStore.filmSuppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))
);

type SupplierOption = { label: string; value: number | string };

const supplierModel = ref<SupplierOption | null>(null);
const filteredSupplierOptions = ref<SupplierOption[]>([]);

watch(supplierOptions, (opts) => { filteredSupplierOptions.value = opts; }, { immediate: true });

watch(supplierModel, (selected) => {
  if (!selected) {
    form.purchaseInfo.supplierId = undefined;
    form.supplierName = '';
    return;
  }
  if (typeof selected.value === 'number') {
    form.purchaseInfo.supplierId = selected.value;
    form.supplierName = '';
  } else {
    form.purchaseInfo.supplierId = undefined;
    form.supplierName = String(selected.value);
  }
});

function onNewSupplierValue(inputVal: string, done: (item?: unknown) => void): void {
  const trimmed = inputVal.trim();
  if (trimmed.length > 0) {
    done({ label: trimmed, value: trimmed });
  } else {
    done();
  }
}

function onSupplierFilter(val: string, update: (fn: () => void) => void): void {
  update(() => {
    const needle = val.toLowerCase();
    filteredSupplierOptions.value = needle === ''
      ? supplierOptions.value
      : supplierOptions.value.filter((opt) => opt.label.toLowerCase().includes(needle));
  });
}
const ratingModel = computed({
  get: () => r$.$value.rating ?? 0,
  set: (value: number) => {
    r$.$value.rating = value > 0 ? value : undefined;
  },
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
  async (newVal) => {
    if (newVal) {
      await Promise.allSettled([referenceStore.loadAll(), emulsionStore.loadAll()]);
      await filmSuppliersStore.loadFilmSuppliers();
      form.name = '';
      form.emulsionId = undefined;
      form.filmFormatId = undefined;
      form.packageTypeId = undefined;
      form.expirationDate = currentDateLocal();
      supplierModel.value = null;
      form.purchaseInfo = {
        supplierId: undefined,
        channel: '',
        price: undefined,
        currencyCode: 'USD',
        orderRef: '',
        obtainedDate: currentDateLocal()
      };
      form.supplierName = '';
      form.rating = undefined;
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
              :disable="props.isCreating"
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
              :disable="isFormatLocked || props.isCreating"
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
              :disable="isEmulsionDisabled || props.isCreating"
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
              :disable="isPackageDisabled || props.isCreating"
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
              :disable="props.isCreating"
              :error="r$.expirationDate?.$error"
              :error-message="r$.expirationDate?.$errors[0]"
            />
          </div>
          <q-select
            v-model="supplierModel"
            filled
            use-input
            fill-input
            hide-selected
            clearable
            input-debounce="0"
            :options="filteredSupplierOptions"
            :disable="props.isCreating"
            label="Supplier (select existing or type new)"
            @new-value="onNewSupplierValue"
            @filter="onSupplierFilter"
          />
          <q-input v-model="form.purchaseInfo.channel" filled label="Purchase channel (optional)" :disable="props.isCreating" />
          <q-input v-model.number="form.purchaseInfo.price" filled type="number" min="0" step="0.01" label="Purchase price (optional)" :disable="props.isCreating" />
          <q-input v-model="form.purchaseInfo.currencyCode" filled label="Currency code (optional, e.g. USD)" :disable="props.isCreating" />
          <q-input v-model="form.purchaseInfo.orderRef" filled label="Order reference (optional)" :disable="props.isCreating" />
          <q-input v-model="form.purchaseInfo.obtainedDate" filled type="date" label="Obtained date (optional)" :disable="props.isCreating" />
          <q-rating v-model="ratingModel" :max="5" size="20px" color="amber" :disable="props.isCreating" />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="Cancel" />
        <q-btn color="primary" label="Create" :loading="isCreating" :disable="isCreating" @click="filmCreateForm?.submit()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
