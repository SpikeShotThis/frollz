import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { FilmCreateRequest } from '@frollz2/schema';
import { useFilmStore } from '../stores/film.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUiFeedback } from './useUiFeedback.js';
import { createIdempotencyKey } from './idempotency.js';

export function useFilmCreateForm() {
  const route = useRoute();
  const filmStore = useFilmStore();
  const referenceStore = useReferenceStore();
  const feedback = useUiFeedback();

  const isCreateDialogOpen = ref(false);
  const isCreating = ref(false);
  const idempotencyKey = ref(createIdempotencyKey());

  const createForm = reactive({
    name: '',
    emulsionId: null as number | null,
    filmFormatId: null as number | null,
    packageTypeId: null as number | null,
    expirationDate: '',
  });

  const lockedFormatFilters = computed(() => {
    const value = route.meta.filmFormatFilters;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  });

  // True only when exactly one format is locked — the field is disabled and pre-set.
  // Multi-format filtered pages (large-format, instant) narrow the list but don't lock.
  const isFormatLocked = computed(() => lockedFormatFilters.value.length === 1);

  const formatOptions = computed(() => {
    const base =
      lockedFormatFilters.value.length > 0
        ? referenceStore.filmFormats.filter((f) => lockedFormatFilters.value.includes(f.code))
        : referenceStore.filmFormats;
    return base.map((format) => ({ label: format.label, value: format.id }));
  });

  const emulsionOptions = computed(() => {
    const formatId = createForm.filmFormatId;
    const emulsions = formatId
      ? referenceStore.emulsions.filter((e) => e.filmFormats.some((f) => f.id === formatId))
      : referenceStore.emulsions;
    return emulsions.map((emulsion) => ({
      label: `${emulsion.manufacturer} ${emulsion.brand} ISO ${emulsion.isoSpeed}`,
      value: emulsion.id,
    }));
  });

  const packageTypeOptions = computed(() => {
    if (!createForm.filmFormatId) return [];
    return referenceStore.packageTypesByFormat(createForm.filmFormatId).map((pkg) => ({
      label: pkg.label,
      value: pkg.id,
    }));
  });

  const isEmulsionDisabled = computed(() => createForm.filmFormatId === null);
  const isPackageDisabled = computed(() => createForm.filmFormatId === null);

  watch(
    () => createForm.filmFormatId,
    () => {
      createForm.emulsionId = null;
      createForm.packageTypeId = null;
    },
  );

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
    if (isFormatLocked.value) {
      const lockedCode = lockedFormatFilters.value[0];
      createForm.filmFormatId =
        referenceStore.filmFormats.find((f) => f.code === lockedCode)?.id ?? null;
    }
    isCreateDialogOpen.value = true;
  }

  async function submitCreate(): Promise<void> {
    if (isCreating.value) return;
    if (
      !createForm.name.trim() ||
      !createForm.emulsionId ||
      !createForm.filmFormatId ||
      !createForm.packageTypeId
    ) {
      feedback.error('Name, emulsion, format, and package are required.');
      return;
    }
    const payload: FilmCreateRequest = {
      name: createForm.name.trim(),
      emulsionId: createForm.emulsionId,
      filmFormatId: createForm.filmFormatId,
      packageTypeId: createForm.packageTypeId,
      expirationDate: createForm.expirationDate
        ? new Date(`${createForm.expirationDate}T00:00:00.000Z`).toISOString()
        : null,
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

  return {
    isCreateDialogOpen,
    isCreating,
    createForm,
    lockedFormatFilters,
    isFormatLocked,
    formatOptions,
    emulsionOptions,
    packageTypeOptions,
    isEmulsionDisabled,
    isPackageDisabled,
    openCreateDialog,
    submitCreate,
  };
}
