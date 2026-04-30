import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { FilmCreateForm, FilmCreateRequest } from '@frollz2/schema';
import { useFilmStore } from '../stores/film.js';
import { useUiFeedback } from './useUiFeedback.js';
import { createIdempotencyKey } from './idempotency.js';

export function useFilmCreateForm() {
  const route = useRoute();
  const filmStore = useFilmStore();
  const feedback = useUiFeedback();

  const isCreateDialogOpen = ref(false);
  const isCreating = ref(false);
  const idempotencyKey = ref(createIdempotencyKey());

  const lockedFormatFilters = computed(() => {
    const value = route.meta.filmFormatFilters;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  });

  const isFormatLocked = computed(() => lockedFormatFilters.value.length === 1);

  function openCreateDialog(): void {
    idempotencyKey.value = createIdempotencyKey();
    isCreateDialogOpen.value = true;
  }

  async function handleCreate(data: FilmCreateForm): Promise<void> {
    if (isCreating.value) return;

    isCreating.value = true;
    try {
      const payload: FilmCreateRequest = {
        name: data.name,
        emulsionId: data.emulsionId,
        filmFormatId: data.filmFormatId,
        packageTypeId: data.packageTypeId,
        expirationDate: data.expirationDate
          ? new Date(`${data.expirationDate}T00:00:00.000Z`).toISOString()
          : null,
        supplierName: data.supplierName?.trim() || undefined,
        purchaseInfo: {
          supplierId: data.purchaseInfo?.supplierId,
          channel: data.purchaseInfo?.channel?.trim() || null,
          price: data.purchaseInfo?.price ?? null,
          currencyCode: data.purchaseInfo?.currencyCode?.trim().toUpperCase() || null,
          orderRef: data.purchaseInfo?.orderRef?.trim() || null,
          obtainedDate: data.purchaseInfo?.obtainedDate
            ? new Date(`${data.purchaseInfo.obtainedDate}T00:00:00.000Z`).toISOString()
            : null
        }
      };
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
    lockedFormatFilters,
    isFormatLocked,
    openCreateDialog,
    handleCreate,
  };
}
