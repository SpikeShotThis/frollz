import { defineStore } from 'pinia';
import { ref } from 'vue';
import { filmHolderSlotSchema, filmReceiverSchema, type FilmHolderSlot, type FilmReceiver, type CreateFilmReceiverRequest, type UpdateFilmReceiverRequest } from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';

export const useReceiverStore = defineStore('receiver', () => {
  const { request } = useApi();
  const receivers = ref<FilmReceiver[]>([]);
  const currentReceiver = ref<FilmReceiver | null>(null);
  const currentSlots = ref<FilmHolderSlot[]>([]);

  async function loadReceivers(): Promise<void> {
    const response = await request('/api/v1/receivers');
    receivers.value = filmReceiverSchema.array().parse(await response.json());
  }

  async function loadReceiver(id: number): Promise<void> {
    const response = await request(`/api/v1/receivers/${id}`);
    currentReceiver.value = filmReceiverSchema.parse(await response.json());
    if (currentReceiver.value.receiverTypeCode === 'film_holder') {
      currentSlots.value = filmHolderSlotSchema.array().parse(currentReceiver.value.slots);
    } else {
      currentSlots.value = [];
    }
  }

  async function createReceiver(input: CreateFilmReceiverRequest): Promise<void> {
    const response = await request('/api/v1/receivers', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    currentReceiver.value = filmReceiverSchema.parse(await response.json());
    await loadReceivers();
  }

  async function updateReceiver(id: number, input: UpdateFilmReceiverRequest): Promise<void> {
    const response = await request(`/api/v1/receivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    currentReceiver.value = filmReceiverSchema.parse(await response.json());
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
    loadReceivers,
    loadReceiver,
    createReceiver,
    updateReceiver,
    deleteReceiver
  };
});