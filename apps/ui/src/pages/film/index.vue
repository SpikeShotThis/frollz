<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { FilmSummary } from '@frollz2/schema';
import FilmCreateDialog from '../../components/FilmCreateDialog.vue';
import FilmInventoryTable from '../../components/FilmInventoryTable.vue';
import { useFilmStore } from '../../stores/film.js';
import { useReferenceStore } from '../../stores/reference.js';
import { useFilmCreateForm } from '../../composables/useFilmCreateForm.js';
import { useFilmSuppliersStore } from '../../stores/film-suppliers.js';

const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const filmSuppliersStore = useFilmSuppliersStore();

const {
  isCreateDialogOpen,
  isCreating,
  lockedFormatFilters,
  isFormatLocked,
  openCreateDialog,
  handleCreate,
} = useFilmCreateForm();

const search = ref<string | null>('');
const stateFilter = ref<string | null>(null);
const supplierFilter = ref<number | null>(null);

const subtitle = computed(() =>
  lockedFormatFilters.value.length > 0
    ? 'Filtered view for selected film formats.'
    : 'Track film stock and move rolls through state transitions.'
);

const rows = computed(() => {
  const query = (search.value ?? '').trim().toLowerCase();

  return filmStore.films.filter((film) => {
    if (lockedFormatFilters.value.length > 0 && !lockedFormatFilters.value.includes(film.filmFormat.code)) {
      return false;
    }

    if (stateFilter.value && film.currentStateCode !== stateFilter.value) {
      return false;
    }
    if (supplierFilter.value && film.supplierId !== supplierFilter.value) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = `${film.name} ${film.emulsion.manufacturer} ${film.emulsion.brand} ${film.currentState.label}`.toLowerCase();
    return haystack.includes(query);
  });
});

const extractName = (row: FilmSummary) => row.name;
const extractState = (row: FilmSummary) => row.currentState.label;
const extractEmulsion = (row: FilmSummary) => `${row.emulsion.manufacturer} ${row.emulsion.brand}`;
const extractFormat = (row: FilmSummary) => row.filmFormat.label;
const extractIso = (row: FilmSummary) => row.emulsion.isoSpeed.toString();

const stateOptions = computed(() =>
  referenceStore.filmStates.map((state) => ({ label: state.label, value: state.code }))
);
const supplierOptions = computed(() =>
  filmSuppliersStore.filmSuppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))
);

onMounted(async () => {
  await Promise.allSettled([referenceStore.loadAll(), filmStore.loadFilms(), filmSuppliersStore.loadFilmSuppliers()]);
});
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div>
        <div class="text-h5">Film Inventory</div>
        <div class="text-subtitle2 text-grey-7">{{ subtitle }}</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn color="primary" label="Add film" @click="openCreateDialog" />
        <q-btn flat color="primary" label="Refresh" @click="filmStore.loadFilms" />
      </div>
    </div>

    <q-banner v-if="filmStore.filmsError" class="bg-red-1 text-negative" rounded>
      {{ filmStore.filmsError }}
    </q-banner>

    <div class="row q-pa-md q-col-gutter-md">
      <div class="col-xs-12 col-lg-6">
        <q-input v-model="search" filled clearable label="Search films" />
      </div>
      <div class="col-xs-12 col-lg-6">
        <q-select v-model="stateFilter" filled clearable emit-value map-options :options="stateOptions"
          label="Filter by state" />
      </div>
      <div class="col-xs-12 col-lg-6">
        <q-select v-model="supplierFilter" filled clearable emit-value map-options :options="supplierOptions"
          label="Filter by supplier" />
      </div>
    </div>

    <FilmInventoryTable
      :rows="rows"
      :is-loading="filmStore.isLoading"
      :extract-name="extractName"
      :extract-state="extractState"
      :extract-emulsion="extractEmulsion"
      :extract-format="extractFormat"
      :extract-iso="extractIso"
    />

    <FilmCreateDialog
      v-model="isCreateDialogOpen"
      :is-format-locked="isFormatLocked"
      :locked-format-filters="lockedFormatFilters"
      :is-creating="isCreating"
      @submit="handleCreate"
    />
  </q-page>
</template>
