import { defineStore } from 'pinia';
import { ref } from 'vue';
import { filmHolderSlotSchema, filmDeviceSchema, type FilmHolderSlot, type FilmDevice, type CreateFilmDeviceRequest, type UpdateFilmDeviceRequest } from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useDeviceStore = defineStore('device', () => {
  const { request } = useApi();
  const devices = ref<FilmDevice[]>([]);
  const currentDevice = ref<FilmDevice | null>(null);
  const currentSlots = ref<FilmHolderSlot[]>([]);
  const isLoading = ref(false);
  const isLoadingDetail = ref(false);
  const listError = ref<string | null>(null);
  const detailError = ref<string | null>(null);

  async function loadDevices(): Promise<void> {
    isLoading.value = true;
    listError.value = null;
    try {
      const response = await request('/api/v1/devices');
      devices.value = filmDeviceSchema.array().parse(await readApiData(response));
    } catch (error) {
      listError.value = error instanceof Error ? error.message : 'Failed to load devices';
      devices.value = [];
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadDevice(id: number): Promise<void> {
    isLoadingDetail.value = true;
    detailError.value = null;
    try {
      const response = await request(`/api/v1/devices/${id}`);
      currentDevice.value = filmDeviceSchema.parse(await readApiData(response));
      if (currentDevice.value.deviceTypeCode === 'film_holder') {
        currentSlots.value = filmHolderSlotSchema.array().parse(currentDevice.value.slots);
      } else {
        currentSlots.value = [];
      }
    } catch (error) {
      detailError.value = error instanceof Error ? error.message : 'Failed to load device detail';
      currentDevice.value = null;
      currentSlots.value = [];
      throw error;
    } finally {
      isLoadingDetail.value = false;
    }
  }

  async function createDevice(input: CreateFilmDeviceRequest, idempotencyKey?: string): Promise<void> {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(input)
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request('/api/v1/devices', init);
    currentDevice.value = filmDeviceSchema.parse(await readApiData(response));
    await loadDevices();
  }

  async function updateDevice(id: number, input: UpdateFilmDeviceRequest): Promise<void> {
    const response = await request(`/api/v1/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    currentDevice.value = filmDeviceSchema.parse(await readApiData(response));
    await loadDevices();
  }

  async function deleteDevice(id: number): Promise<void> {
    await request(`/api/v1/devices/${id}`, { method: 'DELETE' });
    currentDevice.value = null;
    currentSlots.value = [];
    await loadDevices();
  }

  return {
    devices,
    currentDevice,
    currentSlots,
    isLoading,
    isLoadingDetail,
    listError,
    detailError,
    loadDevices,
    loadDevice,
    createDevice,
    updateDevice,
    deleteDevice
  };
});
