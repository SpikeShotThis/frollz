<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { FilmSummary } from '@frollz2/schema';
import FilmCreateDialog from '../../components/FilmCreateDialog.vue';
import FilmInventoryTable from '../../components/FilmInventoryTable.vue';
import { useFilmStore } from '../../stores/film.js';
import { useReferenceStore } from '../../stores/reference.js';
import { useFilmCreateForm } from '../../composables/useFilmCreateForm.js';
import { useFilmCostFormatting } from '../../composables/useFilmCostFormatting.js';
import { useFilmSuppliersStore } from '../../stores/film-suppliers.js';

const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const filmSuppliersStore = useFilmSuppliersStore();
const route = useRoute();

const {
  isCreateDialogOpen,
  isCreating,
  lockedFormatFilters,
  isFormatLocked,
  openCreateDialog,
  handleCreate,
} = useFilmCreateForm();

const { formatKnownCost } = useFilmCostFormatting();

const subtitle = computed(() =>
  lockedFormatFilters.value.length > 0
    ? 'Filtered view for selected film formats.'
    : 'Track film stock and move rolls through state transitions.'
);

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
  const stateCodeFromQuery = typeof route.query.stateCode === 'string' ? route.query.stateCode : null;
  filmStore.filmListStateFilter = stateCodeFromQuery;
  filmStore.filmListLockedFormats = lockedFormatFilters.value;
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
      </div>
    </div>

    <q-banner v-if="filmStore.filmsError" class="bg-red-1 text-negative" rounded>
      {{ filmStore.filmsError }}
    </q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-xs-12 col-lg-6">
        <q-input v-model="filmStore.filmListSearch" filled clearable label="Search films" />
      </div>
      <div class="col-xs-12 col-lg-6">
        <q-select v-model="filmStore.filmListStateFilter" filled clearable emit-value map-options :options="stateOptions"
          label="Filter by state" />
      </div>
      <div class="col-xs-12 col-lg-6">
        <q-select v-model="filmStore.filmListSupplierFilter" filled clearable emit-value map-options :options="supplierOptions"
          label="Filter by supplier" />
      </div>
    </div>

    <FilmInventoryTable
      :rows="filmStore.filteredFilms"
      :is-loading="filmStore.isLoading"
      :extract-name="extractName"
      :extract-state="extractState"
      :extract-emulsion="extractEmulsion"
      :extract-format="extractFormat"
      :extract-iso="extractIso"
      :extract-known-cost="formatKnownCost"
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
