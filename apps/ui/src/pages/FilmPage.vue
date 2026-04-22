<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NSelect,
  NSpace,
  NTag,
  NText
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { FilmCreateRequest, FilmListQuery, FilmSummary } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useReferenceStore } from '../stores/reference.js';
import { useFilmStore } from '../stores/film.js';
import PageShell from '../components/PageShell.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState, TableState } from '../composables/ui-state.js';

const referenceStore = useReferenceStore();
const filmStore = useFilmStore();
const router = useRouter();
const route = useRoute();
const feedback = useUiFeedback();

const isCreateDrawerOpen = ref(false);
const isCreatingFilm = ref(false);
const expirationTimestamp = ref<number | null>(null);

const filters = reactive<{
  stateCode: string | null;
  filmFormatId: number | null;
  emulsionId: number | null;
}>({
  stateCode: null,
  filmFormatId: null,
  emulsionId: null
});

const createForm = reactive<{
  name: string;
  emulsionId: number | null;
  filmFormatId: number | null;
  packageTypeId: number | null;
}>({
  name: '',
  emulsionId: null,
  filmFormatId: null,
  packageTypeId: null
});

const createState = ref<FormState>({
  loading: false,
  fieldErrors: {},
  formError: null
});

const lockedFilmFormatCodes = computed<string[]>(() => {
  if (!Array.isArray(route.meta.filmFormatFilters)) {
    return [];
  }

  return route.meta.filmFormatFilters.filter((code): code is string => typeof code === 'string');
});
const isLockedBreakout = computed(() => lockedFilmFormatCodes.value.length > 0);
const pageSubtitle = computed(() =>
  isLockedBreakout.value
    ? 'Route-locked category view from navigation.'
    : 'Track each roll through its lifecycle and quickly continue work.'
);
const displayedFilms = computed(() => {
  if (!isLockedBreakout.value) {
    return filmStore.films;
  }

  return filmStore.films.filter((film) => lockedFilmFormatCodes.value.includes(film.filmFormat.code));
});

const tableState = computed<TableState>(() => ({
  loading: filmStore.isLoading,
  empty: !filmStore.isLoading && displayedFilms.value.length === 0,
  error: filmStore.filmsError,
  retry: refresh
}));

const stateTypeByCode: Record<string, 'default' | 'info' | 'primary' | 'warning' | 'success'> = {
  purchased: 'default',
  stored: 'info',
  loaded: 'primary',
  exposed: 'warning',
  removed: 'warning',
  sent_for_dev: 'info',
  developed: 'success',
  scanned: 'success',
  archived: 'default'
};

const activeFilterCount = computed(
  () =>
    isLockedBreakout.value
      ? 0
      : Number(Boolean(filters.stateCode)) + Number(Boolean(filters.filmFormatId)) + Number(Boolean(filters.emulsionId))
);

const activeFilters = computed(() => {
  if (isLockedBreakout.value) {
    return [];
  }

  const items: string[] = [];

  if (filters.stateCode) {
    const state = referenceStore.filmStates.find((entry) => entry.code === filters.stateCode);
    items.push(`State: ${state?.label ?? filters.stateCode}`);
  }

  if (filters.filmFormatId) {
    const format = referenceStore.filmFormats.find((entry) => entry.id === filters.filmFormatId);
    items.push(`Format: ${format?.label ?? filters.filmFormatId}`);
  }

  if (filters.emulsionId) {
    const emulsion = referenceStore.emulsions.find((entry) => entry.id === filters.emulsionId);
    items.push(`Emulsion: ${emulsion ? `${emulsion.manufacturer} ${emulsion.brand}` : filters.emulsionId}`);
  }

  return items;
});

const columns = computed<DataTableColumns<FilmSummary>>(() => [
  { title: 'Name', key: 'name' },
  {
    title: 'Emulsion',
    key: 'emulsion',
    render: (row) => `${row.emulsion.manufacturer} ${row.emulsion.brand}`
  },
  {
    title: 'Format',
    key: 'filmFormat',
    render: (row) => row.filmFormat.code
  },
  {
    title: 'Package',
    key: 'packageType',
    render: (row) => row.packageType.code
  },
  {
    title: 'State',
    key: 'currentStateCode',
    render: (row) => h(NTag, { type: stateTypeByCode[row.currentStateCode] ?? 'default' }, { default: () => row.currentState.label })
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (row) =>
      h(NSpace, { wrapItem: false }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              tertiary: true,
              onClick: () => {
                void router.push(`/film/${row.id}`);
              }
            },
            { default: () => 'Open timeline' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              secondary: true,
              onClick: () => {
                void router.push({ path: `/film/${row.id}`, query: { openEvent: '1' } });
              }
            },
            { default: () => 'Open event composer' }
          )
        ]
      })
  }
]);

const stateOptions = computed(() =>
  referenceStore.filmStates.map((state) => ({ label: state.label, value: state.code }))
);
const formatOptions = computed(() =>
  referenceStore.filmFormats.map((format) => ({ label: format.label, value: format.id }))
);
const emulsionOptions = computed(() =>
  referenceStore.emulsions.map((emulsion) => ({
    label: `${emulsion.manufacturer} ${emulsion.brand} ${emulsion.isoSpeed}`,
    value: emulsion.id
  }))
);
const packageTypeOptions = computed(() => {
  if (!createForm.filmFormatId) {
    return [];
  }

  return referenceStore.packageTypesByFormat(createForm.filmFormatId).map((packageType) => ({
    label: packageType.label,
    value: packageType.id
  }));
});

const createFieldErrors = computed<Record<string, string>>(() => {
  const nextErrors: Record<string, string> = {};
  if (!createForm.name.trim()) {
    nextErrors.name = 'Film name is required.';
  }
  if (!createForm.emulsionId) {
    nextErrors.emulsionId = 'Select an emulsion.';
  }
  if (!createForm.filmFormatId) {
    nextErrors.filmFormatId = 'Select a film format.';
  }
  if (!createForm.packageTypeId) {
    nextErrors.packageTypeId = 'Select a package type.';
  }
  return nextErrors;
});

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
    if (isLockedBreakout.value) {
      filters.stateCode = null;
      filters.filmFormatId = null;
      filters.emulsionId = null;
    }
    await refresh();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load film inventory.'));
  }
});

watch(
  () => route.fullPath,
  () => {
    if (isLockedBreakout.value) {
      filters.stateCode = null;
      filters.filmFormatId = null;
      filters.emulsionId = null;
    }
    void refresh();
  }
);

async function refresh(): Promise<void> {
  try {
    await filmStore.loadFilms(isLockedBreakout.value ? {} : buildQuery());
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not refresh film inventory.'));
  }
}

function buildQuery(): FilmListQuery {
  return {
    ...(filters.stateCode ? { stateCode: filters.stateCode } : {}),
    ...(filters.filmFormatId ? { filmFormatId: filters.filmFormatId } : {}),
    ...(filters.emulsionId ? { emulsionId: filters.emulsionId } : {})
  };
}

async function applyFilters(): Promise<void> {
  if (isLockedBreakout.value) {
    return;
  }

  await refresh();
}

function resetFilters(): void {
  if (isLockedBreakout.value) {
    return;
  }

  filters.stateCode = null;
  filters.filmFormatId = null;
  filters.emulsionId = null;
  void refresh();
}

function resetCreateForm(): void {
  createForm.name = '';
  createForm.emulsionId = null;
  createForm.filmFormatId = null;
  createForm.packageTypeId = null;
  expirationTimestamp.value = null;
  createState.value.fieldErrors = {};
  createState.value.formError = null;
}

async function submitCreateFilm(): Promise<void> {
  if (isCreatingFilm.value) {
    return;
  }

  createState.value.fieldErrors = createFieldErrors.value;
  if (Object.keys(createState.value.fieldErrors).length > 0) {
    createState.value.formError = 'Please complete all required fields.';
    return;
  }

  const payload: FilmCreateRequest = {
    name: createForm.name.trim(),
    emulsionId: createForm.emulsionId as number,
    filmFormatId: createForm.filmFormatId as number,
    packageTypeId: createForm.packageTypeId as number,
    expirationDate: expirationTimestamp.value ? new Date(expirationTimestamp.value).toISOString() : null
  };

  isCreatingFilm.value = true;
  createState.value.loading = true;
  createState.value.formError = null;

  try {
    await filmStore.createFilm(payload, createIdempotencyKey());
    isCreateDrawerOpen.value = false;
    resetCreateForm();
    feedback.success('Film created successfully.');
    await refresh();
  } catch (error) {
    createState.value.formError = feedback.toErrorMessage(error, 'Could not create film.');
  } finally {
    isCreatingFilm.value = false;
    createState.value.loading = false;
  }
}
</script>

<template>
  <PageShell title="Film Inventory" :subtitle="pageSubtitle">
    <template #actions>
      <NButton type="primary" @click="isCreateDrawerOpen = true">Add film</NButton>
      <NButton tertiary @click="refresh">Refresh</NButton>
    </template>

    <NCard v-if="!isLockedBreakout" title="Filters" size="small">
      <NGrid cols="1 1 3" x-gap="12" y-gap="12">
        <NGridItem>
          <NSelect v-model:value="filters.stateCode" :options="stateOptions" clearable placeholder="Filter by state" />
        </NGridItem>
        <NGridItem>
          <NSelect v-model:value="filters.filmFormatId" :options="formatOptions" clearable placeholder="Filter by format" />
        </NGridItem>
        <NGridItem>
          <NSelect
            v-model:value="filters.emulsionId"
            :options="emulsionOptions"
            clearable
            filterable
            placeholder="Filter by emulsion"
          />
        </NGridItem>
      </NGrid>
      <NFlex justify="space-between" align="center" style="margin-top: 12px;">
        <NSpace>
          <NButton tertiary @click="applyFilters">Apply filters</NButton>
          <NButton tertiary :disabled="activeFilterCount === 0" @click="resetFilters">Clear all</NButton>
        </NSpace>
        <NSpace>
          <NTag v-for="filter in activeFilters" :key="filter" type="info" size="small">{{ filter }}</NTag>
        </NSpace>
      </NFlex>
    </NCard>

    <NCard title="Your films">
      <NFlex vertical size="medium">
        <NAlert v-if="tableState.error" type="error" :show-icon="true">
          {{ tableState.error }}
        </NAlert>
        <NDataTable :columns="columns" :data="displayedFilms" :loading="filmStore.isLoading" :row-key="(row) => row.id" />
        <NEmpty v-if="tableState.empty && !tableState.error" description="No films match these filters yet." />
      </NFlex>
    </NCard>
  </PageShell>

  <NDrawer v-model:show="isCreateDrawerOpen" placement="right" width="420">
    <NDrawerContent title="Add film" closable>
      <NForm label-placement="top" @submit.prevent="submitCreateFilm">
        <NAlert v-if="createState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ createState.formError }}
        </NAlert>

        <NFormItem
          label="Name"
          required
          :feedback="createState.fieldErrors.name || ''"
        >
          <NInput v-model:value="createForm.name" placeholder="Film label" />
        </NFormItem>
        <NFormItem
          label="Emulsion"
          required
          :feedback="createState.fieldErrors.emulsionId || ''"
        >
          <NSelect
            v-model:value="createForm.emulsionId"
            :options="emulsionOptions"
            filterable
            placeholder="Select emulsion"
            data-testid="create-film-emulsion"
          />
        </NFormItem>
        <NFormItem
          label="Film format"
          required
          :feedback="createState.fieldErrors.filmFormatId || ''"
        >
          <NSelect
            v-model:value="createForm.filmFormatId"
            :options="formatOptions"
            placeholder="Select format"
            data-testid="create-film-format"
            @update:value="createForm.packageTypeId = null"
          />
        </NFormItem>
        <NFormItem
          label="Package type"
          required
          :feedback="createState.fieldErrors.packageTypeId || ''"
        >
          <NSelect
            v-model:value="createForm.packageTypeId"
            :options="packageTypeOptions"
            placeholder="Select package"
            data-testid="create-film-package"
          />
        </NFormItem>
        <NFormItem label="Expiration date">
          <NDatePicker v-model:value="expirationTimestamp" type="datetime" clearable />
        </NFormItem>
        <NFlex justify="space-between" align="center">
          <NText depth="3">Required fields are marked with an asterisk.</NText>
          <NSpace>
            <NButton tertiary @click="isCreateDrawerOpen = false">Cancel</NButton>
            <NButton type="primary" attr-type="submit" :loading="isCreatingFilm" :disabled="isCreatingFilm">
              Create film
            </NButton>
          </NSpace>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>
</template>
