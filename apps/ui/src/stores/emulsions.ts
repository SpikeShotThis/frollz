import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  createEmulsionRequestSchema,
  emulsionSchema,
  updateEmulsionRequestSchema,
  type CreateEmulsionRequest,
  type Emulsion,
  type UpdateEmulsionRequest
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useEmulsionStore = defineStore('emulsions', () => {
  const { request } = useApi();
  const emulsions = ref<Emulsion[]>([]);
  const currentEmulsion = ref<Emulsion | null>(null);

  const loaded = computed(() => emulsions.value.length > 0);
  const isLoading = ref(false);
  const isLoadingEmulsionDetail = ref(false);
  const loadError = ref<string | null>(null);
  const emulsionDetailError = ref<string | null>(null);
  const emulsionSearch = ref<string>('');
  const emulsionProcessFilter = ref<string | null>(null);
  let loadAllInFlight: Promise<void> | null = null;
  let loadEmulsionInFlight: Promise<void> | null = null;
  let loadEmulsionInFlightId: number | null = null;

  async function loadAll(force = false): Promise<void> {
    if (loaded.value && !force) {
      return;
    }

    if (loadAllInFlight) {
      return loadAllInFlight;
    }

    isLoading.value = true;
    loadError.value = null;
    loadAllInFlight = (async () => {
      try {
        const response = await request('/api/v1/emulsions');
        emulsions.value = emulsionSchema.array().parse(await readApiData(response));
      } catch (error) {
        loadError.value = error instanceof Error ? error.message : 'Failed to load emulsions';
        throw error;
      } finally {
        isLoading.value = false;
        loadAllInFlight = null;
      }
    })();

    return loadAllInFlight;
  }

  async function loadEmulsion(id: number): Promise<void> {
    if (loadEmulsionInFlight && loadEmulsionInFlightId === id) {
      return loadEmulsionInFlight;
    }

    isLoadingEmulsionDetail.value = true;
    emulsionDetailError.value = null;
    currentEmulsion.value = null;
    loadEmulsionInFlightId = id;
    loadEmulsionInFlight = (async () => {
      try {
        const response = await request(`/api/v1/emulsions/${id}`);
        currentEmulsion.value = emulsionSchema.parse(await readApiData(response));
      } catch (error) {
        emulsionDetailError.value = error instanceof Error ? error.message : 'Failed to load emulsion detail';
        currentEmulsion.value = null;
        throw error;
      } finally {
        isLoadingEmulsionDetail.value = false;
        loadEmulsionInFlight = null;
        loadEmulsionInFlightId = null;
      }
    })();

    return loadEmulsionInFlight;
  }

  async function createEmulsion(input: CreateEmulsionRequest, idempotencyKey?: string): Promise<Emulsion> {
    const payload = createEmulsionRequestSchema.parse(input);
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(payload)
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request('/api/v1/emulsions', init);
    const created = emulsionSchema.parse(await readApiData(response));
    try {
      await loadAll(true);
    } catch {
      const existing = emulsions.value.some((item) => item.id === created.id);
      if (!existing) {
        emulsions.value = [...emulsions.value, created];
      }
    }

    return created;
  }

  async function updateEmulsion(id: number, input: UpdateEmulsionRequest): Promise<Emulsion> {
    const payload = updateEmulsionRequestSchema.parse(input);
    const response = await request(`/api/v1/emulsions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    const updated = emulsionSchema.parse(await readApiData(response));
    currentEmulsion.value = updated;
    try {
      await loadAll(true);
    } catch {
      emulsions.value = emulsions.value.map((item) => (item.id === id ? updated : item));
    }
    return updated;
  }

  async function deleteEmulsion(id: number): Promise<void> {
    await request(`/api/v1/emulsions/${id}`, { method: 'DELETE' });
    if (currentEmulsion.value?.id === id) {
      currentEmulsion.value = null;
    }
    try {
      await loadAll(true);
    } catch {
      emulsions.value = emulsions.value.filter((item) => item.id !== id);
    }
  }

  function setProcessFilterFromMeta(value: unknown): void {
    emulsionProcessFilter.value = typeof value === 'string' ? value : null;
  }

  const filteredEmulsions = computed(() => {
    const query = emulsionSearch.value.trim().toLowerCase();
    return emulsions.value.filter((emulsion) => {
      if (emulsionProcessFilter.value && emulsion.developmentProcess.code !== emulsionProcessFilter.value) return false;
      if (!query) return true;
      const haystack = `${emulsion.manufacturer} ${emulsion.brand} ${emulsion.developmentProcess.label} ${emulsion.isoSpeed}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  return {
    emulsions,
    currentEmulsion,
    loaded,
    isLoading,
    isLoadingEmulsionDetail,
    loadError,
    emulsionDetailError,
    emulsionSearch,
    emulsionProcessFilter,
    filteredEmulsions,
    loadAll,
    loadEmulsion,
    createEmulsion,
    updateEmulsion,
    deleteEmulsion,
    setProcessFilterFromMeta
  };
});
