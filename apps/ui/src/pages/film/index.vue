<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { FilmCreateRequest, FilmSummary } from '@frollz2/schema';
import { useFilmStore } from '../../stores/film.js';
import { useReferenceStore } from '../../stores/reference.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../../composables/idempotency.js';

const route = useRoute();
const filmStore = useFilmStore();
const referenceStore = useReferenceStore();
const feedback = useUiFeedback();

const search = ref<string | null>('');
const stateFilter = ref<string | null>(null);
const isCreateDialogOpen = ref(false);
const isCreating = ref(false);
const idempotencyKey = ref(createIdempotencyKey());

const createForm = reactive({
  name: '',
  emulsionId: null as number | null,
  filmFormatId: null as number | null,
  packageTypeId: null as number | null,
  expirationDate: ''
});

const lockedFormatFilters = computed(() => {
  const value = route.meta.filmFormatFilters;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
});

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

    if (!query) {
      return true;
    }

    const haystack = `${film.name} ${film.emulsion.manufacturer} ${film.emulsion.brand} ${film.currentState.label}`.toLowerCase();
    return haystack.includes(query);
  });
});

const columns = [
  {
    name: 'name',
    label: 'Film',
    field: 'name',
    sortable: true,
    align: 'left'
  },
  {
    name: 'state',
    label: 'State',
    field: (row: FilmSummary) => row.currentState.label,
    sortable: true,
    align: 'left'
  },
  {
    name: 'emulsion',
    label: 'Emulsion',
    field: (row: FilmSummary) => `${row.emulsion.manufacturer} ${row.emulsion.brand}`,
    sortable: true,
    align: 'left'
  },
  {
    name: 'format',
    label: 'Format',
    field: (row: FilmSummary) => row.filmFormat.label,
    sortable: true,
    align: 'left'
  },
  {
    name: 'iso',
    label: 'ISO',
    field: (row: FilmSummary) => row.emulsion.isoSpeed,
    sortable: true,
    align: 'left'
  }
];

const stateOptions = computed(() =>
  referenceStore.filmStates.map((state) => ({
    label: state.label,
    value: state.code
  }))
);

const emulsionOptions = computed(() =>
  referenceStore.emulsions.map((emulsion) => ({
    label: `${emulsion.manufacturer} ${emulsion.brand} ISO ${emulsion.isoSpeed}`,
    value: emulsion.id
  }))
);

const formatOptions = computed(() =>
  referenceStore.filmFormats.map((format) => ({
    label: format.label,
    value: format.id
  }))
);

const packageTypeOptions = computed(() => {
  if (!createForm.filmFormatId) {
    return [];
  }

  return referenceStore.packageTypesByFormat(createForm.filmFormatId).map((pkg) => ({
    label: pkg.label,
    value: pkg.id
  }));
});

function resetCreateForm(): void {
  createForm.name = '';
  createForm.emulsionId = null;
  createForm.filmFormatId = null;
  createForm.packageTypeId = null;
  createForm.expirationDate = '';
  idempotencyKey.value = createIdempotencyKey();
}

function openCreateDialog(): void {
  resetCreateForm();
  isCreateDialogOpen.value = true;
}

async function submitCreate(): Promise<void> {
  if (isCreating.value) {
    return;
  }

  if (!createForm.name.trim() || !createForm.emulsionId || !createForm.filmFormatId || !createForm.packageTypeId) {
    feedback.error('Name, emulsion, format, and package are required.');
    return;
  }

  const payload: FilmCreateRequest = {
    name: createForm.name.trim(),
    emulsionId: createForm.emulsionId,
    filmFormatId: createForm.filmFormatId,
    packageTypeId: createForm.packageTypeId,
    expirationDate: createForm.expirationDate ? new Date(`${createForm.expirationDate}T00:00:00.000Z`).toISOString() : null
  };

  isCreating.value = true;
  try {
    await filmStore.createFilm(payload, idempotencyKey.value);
    feedback.success('Film created.');
    isCreateDialogOpen.value = false;
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to create film.'));
  } finally {
    isCreating.value = false;
  }
}

onMounted(async () => {
  await Promise.allSettled([referenceStore.loadAll(), filmStore.loadFilms()]);
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

    <div class="row q-col-gutter-md">
      <div class="col-xs-12 col-lg-6">
        <q-input v-model="search" filled clearable label="Search films" />
      </div>
      <div class="col-xs-12 col-lg-6">
        <q-select v-model="stateFilter" filled clearable emit-value map-options :options="stateOptions" label="Filter by state" />
      </div>
    </div>

    <q-table :rows="rows" :columns="columns" row-key="id" flat bordered :loading="filmStore.isLoading">
      <template #body-cell-name="props">
        <q-td :props="props">
          <RouterLink :to="`/film/${props.row.id}`" class="text-primary text-weight-medium">
            {{ props.row.name }}
          </RouterLink>
        </q-td>
      </template>
      <template #body-cell-state="props">
        <q-td :props="props">
          <q-badge color="primary" outline>{{ props.row.currentState.label }}</q-badge>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="isCreateDialogOpen" data-testid="film-create-dialog">
      <q-card class="full-width">
        <q-card-section>
          <div class="text-h6">Create film</div>
        </q-card-section>

        <q-card-section>
          <q-form class="column q-gutter-md" data-testid="film-create-form" @submit="submitCreate">
            <div data-testid="film-create-name">
              <q-input v-model="createForm.name" filled label="Film name" />
            </div>
            <div data-testid="film-create-emulsion">
              <q-select
                v-model="createForm.emulsionId"
                filled
                emit-value
                map-options
                :options="emulsionOptions"
                label="Emulsion"
              />
            </div>
            <div data-testid="film-create-format">
              <q-select
                v-model="createForm.filmFormatId"
                filled
                emit-value
                map-options
                :options="formatOptions"
                label="Film format"
              />
            </div>
            <div data-testid="film-create-package">
              <q-select
                v-model="createForm.packageTypeId"
                filled
                emit-value
                map-options
                :options="packageTypeOptions"
                label="Package type"
              />
            </div>
            <div data-testid="film-create-expiration">
              <q-input v-model="createForm.expirationDate" filled type="date" label="Expiration date (optional)" />
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn color="primary" label="Create" :loading="isCreating" @click="submitCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
