<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NTag,
  NText
} from 'naive-ui';
import type { FilmCreateRequest } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useReferenceStore } from '../stores/reference.js';
import { useFilmStore } from '../stores/film.js';
import PageShell from '../components/PageShell.vue';
import MiniDashboardLayout from '../components/MiniDashboardLayout.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

const referenceStore = useReferenceStore();
const filmStore = useFilmStore();
const router = useRouter();
const route = useRoute();
const feedback = useUiFeedback();

const isCreateDrawerOpen = ref(false);
const isCreatingFilm = ref(false);
const expirationTimestamp = ref<number | null>(null);

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

const lockedFilmFormatCodes = computed<string[]>(() => {
  if (!Array.isArray(route.meta.filmFormatFilters)) {
    return [];
  }

  return route.meta.filmFormatFilters.filter((code): code is string => typeof code === 'string');
});

const isLockedBreakout = computed(() => lockedFilmFormatCodes.value.length > 0);

const pageSubtitle = computed(() =>
  isLockedBreakout.value
    ? 'Route-locked category dashboard from navigation.'
    : 'Film inventory dashboard with the latest rolls and key status counts.'
);

const displayedFilms = computed(() => {
  if (!isLockedBreakout.value) {
    return filmStore.films;
  }

  return filmStore.films.filter((film) => lockedFilmFormatCodes.value.includes(film.filmFormat.code));
});

const recentFilms = computed(() => displayedFilms.value.slice(-10));

const stats = computed(() => [
  { label: 'Total visible films', value: displayedFilms.value.length, helper: 'Current route scope' },
  {
    label: 'Loaded films',
    value: displayedFilms.value.filter((film) => film.currentStateCode === 'loaded').length,
    helper: 'Currently loaded in devices'
  },
  {
    label: 'Exposed films',
    value: displayedFilms.value.filter((film) => film.currentStateCode === 'exposed').length,
    helper: 'Awaiting next transition'
  },
  {
    label: 'Sent for development',
    value: displayedFilms.value.filter((film) => film.currentStateCode === 'sent_for_dev').length,
    helper: 'In lab processing stage'
  }
]);

const emulsionOptions = computed(() =>
  referenceStore.emulsions.map((emulsion) => ({
    label: `${emulsion.manufacturer} ${emulsion.brand} ${emulsion.isoSpeed}`,
    value: emulsion.id
  }))
);
const formatOptions = computed(() =>
  referenceStore.filmFormats.map((format) => ({ label: format.label, value: format.id }))
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

async function refresh(): Promise<void> {
  try {
    await filmStore.loadFilms();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not refresh film inventory.'));
  }
}

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
    await refresh();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load film inventory.'));
  }
});

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

    <MiniDashboardLayout left-panel-title="Recently added films" right-panel-title="Film statistics">
      <template #left>
        <NCard :loading="filmStore.isLoading">
          <NAlert v-if="filmStore.filmsError" type="error" :show-icon="true" style="margin-bottom: 10px;">
            {{ filmStore.filmsError }}
          </NAlert>
          <NEmpty
            v-if="!filmStore.isLoading && !filmStore.filmsError && recentFilms.length === 0"
            description="No films are available yet."
          />
          <NFlex v-else vertical size="small">
            <NCard v-for="film in recentFilms" :key="film.id" size="small" embedded>
              <NFlex justify="space-between" align="center" :wrap="false">
                <NText strong>{{ film.name }}</NText>
                <NTag :type="stateTypeByCode[film.currentStateCode] ?? 'default'" size="small">
                  {{ film.currentState.label }}
                </NTag>
              </NFlex>
              <NText depth="3">{{ film.emulsion.manufacturer }} {{ film.emulsion.brand }} · ISO {{ film.emulsion.isoSpeed }}</NText>
              <NText depth="3">{{ film.filmFormat.code }} · {{ film.packageType.label }}</NText>
              <NFlex justify="end">
                <NButton tertiary size="small" @click="router.push(`/film/${film.id}`)">Open timeline</NButton>
              </NFlex>
            </NCard>
          </NFlex>
        </NCard>
      </template>

      <template #right>
        <NCard v-for="card in stats" :key="card.label" size="small">
          <NFlex vertical size="small">
            <NText depth="3">{{ card.label }}</NText>
            <NText style="font-size: 1.45rem; font-weight: 700;">{{ card.value }}</NText>
            <NText depth="3">{{ card.helper }}</NText>
          </NFlex>
        </NCard>
      </template>
    </MiniDashboardLayout>
  </PageShell>

  <NDrawer v-model:show="isCreateDrawerOpen" placement="right" width="min(100vw, 420px)">
    <NDrawerContent title="Add film" closable>
      <NForm label-placement="top" @submit.prevent="submitCreateFilm">
        <NAlert v-if="createState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ createState.formError }}
        </NAlert>

        <NFormItem
          label="Name"
          required
          :label-props="{ for: 'film-create-name-input' }"
          :feedback="createState.fieldErrors.name || ''"
        >
          <NInput
            v-model:value="createForm.name"
            placeholder="Film label"
            :input-props="{ id: 'film-create-name-input', name: 'name' }"
          />
        </NFormItem>
        <NFormItem
          label="Emulsion"
          required
          :label-props="{ for: 'film-create-emulsion-input' }"
          :feedback="createState.fieldErrors.emulsionId || ''"
        >
          <NSelect
            v-model:value="createForm.emulsionId"
            :options="emulsionOptions"
            filterable
            placeholder="Select emulsion"
            data-testid="create-film-emulsion"
            :input-props="{ id: 'film-create-emulsion-input', name: 'emulsionId' }"
          />
        </NFormItem>
        <NFormItem
          label="Film format"
          required
          :label-props="{ for: 'film-create-format-input' }"
          :feedback="createState.fieldErrors.filmFormatId || ''"
        >
          <NSelect
            v-model:value="createForm.filmFormatId"
            :options="formatOptions"
            placeholder="Select format"
            data-testid="create-film-format"
            :input-props="{ id: 'film-create-format-input', name: 'filmFormatId' }"
            @update:value="createForm.packageTypeId = null"
          />
        </NFormItem>
        <NFormItem
          label="Package type"
          required
          :label-props="{ for: 'film-create-package-input' }"
          :feedback="createState.fieldErrors.packageTypeId || ''"
        >
          <NSelect
            v-model:value="createForm.packageTypeId"
            :options="packageTypeOptions"
            placeholder="Select package"
            data-testid="create-film-package"
            :input-props="{ id: 'film-create-package-input', name: 'packageTypeId' }"
          />
        </NFormItem>
        <NFormItem label="Expiration date" :label-props="{ for: 'film-create-expiration-input' }">
          <NDatePicker
            v-model:value="expirationTimestamp"
            type="datetime"
            clearable
            :input-props="{ id: 'film-create-expiration-input', name: 'expirationDate' }"
          />
        </NFormItem>
        <NFlex justify="space-between" align="center">
          <NText depth="3">Required fields are marked with an asterisk.</NText>
          <NFlex>
            <NButton tertiary @click="isCreateDrawerOpen = false">Cancel</NButton>
            <NButton type="primary" attr-type="submit" :loading="isCreatingFilm" :disabled="isCreatingFilm">
              Create film
            </NButton>
          </NFlex>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>
</template>
