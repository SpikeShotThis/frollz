import { defineStore } from 'pinia';
import { ref } from 'vue';
import { filmHolderSlotSchema, filmReceiverSchema, type FilmHolderSlot, type FilmReceiver, type CreateFilmReceiverRequest, type UpdateFilmReceiverRequest } from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useReceiverStore = defineStore('receiver', () => {
  const { request } = useApi();
  const receivers = ref<FilmReceiver[]>([]);
  const currentReceiver = ref<FilmReceiver | null>(null);
  const currentSlots = ref<FilmHolderSlot[]>([]);
  const isLoading = ref(false);
  const isLoadingDetail = ref(false);
  const listError = ref<string | null>(null);
  const detailError = ref<string | null>(null);

  async function loadReceivers(): Promise<void> {
    isLoading.value = true;
    listError.value = null;
    try {
      const response = await request('/api/v1/receivers');
      receivers.value = filmReceiverSchema.array().parse(await readApiData(response));
    } catch (error) {
      listError.value = error instanceof Error ? error.message : 'Failed to load receivers';
      receivers.value = [];
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadReceiver(id: number): Promise<void> {
    isLoadingDetail.value = true;
    detailError.value = null;
    try {
      const response = await request(`/api/v1/receivers/${id}`);
      currentReceiver.value = filmReceiverSchema.parse(await readApiData(response));
      if (currentReceiver.value.receiverTypeCode === 'film_holder') {
        currentSlots.value = filmHolderSlotSchema.array().parse(currentReceiver.value.slots);
      } else {
        currentSlots.value = [];
      }
    } catch (error) {
      detailError.value = error instanceof Error ? error.message : 'Failed to load receiver detail';
      currentReceiver.value = null;
      currentSlots.value = [];
      throw error;
    } finally {
      isLoadingDetail.value = false;
    }
  }

  async function createReceiver(input: CreateFilmReceiverRequest, idempotencyKey?: string): Promise<void> {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(input)
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request('/api/v1/receivers', init);
    currentReceiver.value = filmReceiverSchema.parse(await readApiData(response));
    await loadReceivers();
  }

  async function updateReceiver(id: number, input: UpdateFilmReceiverRequest): Promise<void> {
    const response = await request(`/api/v1/receivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    currentReceiver.value = filmReceiverSchema.parse(await readApiData(response));
    await loadReceivers();
  }

  async function deleteReceiver(id: number): Promise<void> {
    await request(`/api/v1/receivers/${id}`, { method: 'DELETE' });
    currentReceiver.value = null;
    currentSlots.value = [];
    await loadReceivers();
  }

  return {
    receivers,
    currentReceiver,
    currentSlots,
    isLoading,
    isLoadingDetail,
    listError,
    detailError,
    loadReceivers,
    loadReceiver,
    createReceiver,
    updateReceiver,
    deleteReceiver
  };
});
