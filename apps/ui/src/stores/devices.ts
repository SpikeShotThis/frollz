import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  deviceLoadTimelineEventSchema,
  filmHolderSlotSchema,
  filmDeviceSchema,
  type DeviceLoadTimelineEvent,
  type FilmHolderSlot,
  type FilmDevice,
  type CreateFilmDeviceRequest,
  type UpdateFilmDeviceRequest
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useDeviceStore = defineStore('device', () => {
  const { request } = useApi();
  const devices = ref<FilmDevice[]>([]);
  const currentDevice = ref<FilmDevice | null>(null);
  const currentSlots = ref<FilmHolderSlot[]>([]);
  const currentLoadEvents = ref<DeviceLoadTimelineEvent[]>([]);
  const isLoading = ref(false);
  const isLoadingDetail = ref(false);
  const listError = ref<string | null>(null);
  const detailError = ref<string | null>(null);
  let loadDevicesInFlight: Promise<void> | null = null;
  let loadDeviceInFlight: Promise<void> | null = null;
  let loadDeviceInFlightId: number | null = null;

  async function loadDevices(): Promise<void> {
    if (loadDevicesInFlight) {
      return loadDevicesInFlight;
    }

    isLoading.value = true;
    listError.value = null;
    loadDevicesInFlight = (async () => {
      try {
        const response = await request('/api/v1/devices');
        devices.value = filmDeviceSchema.array().parse(await readApiData(response));
      } catch (error) {
        listError.value = error instanceof Error ? error.message : 'Failed to load devices';
        devices.value = [];
        throw error;
      } finally {
        isLoading.value = false;
        loadDevicesInFlight = null;
      }
    })();

    return loadDevicesInFlight;
  }

  async function loadDevice(id: number): Promise<void> {
    if (loadDeviceInFlight && loadDeviceInFlightId === id) {
      return loadDeviceInFlight;
    }

    isLoadingDetail.value = true;
    detailError.value = null;
    currentLoadEvents.value = [];
    loadDeviceInFlightId = id;
    loadDeviceInFlight = (async () => {
      try {
        const response = await request(`/api/v1/devices/${id}`);
        currentDevice.value = filmDeviceSchema.parse(await readApiData(response));
        const loadEventsResponse = await request(`/api/v1/devices/${id}/load-events`);
        currentLoadEvents.value = deviceLoadTimelineEventSchema.array().parse(await readApiData(loadEventsResponse));
        if (currentDevice.value.deviceTypeCode === 'film_holder') {
          currentSlots.value = filmHolderSlotSchema.array().parse(currentDevice.value.slots);
        } else {
          currentSlots.value = [];
        }
      } catch (error) {
        detailError.value = error instanceof Error ? error.message : 'Failed to load device detail';
        currentDevice.value = null;
        currentSlots.value = [];
        currentLoadEvents.value = [];
        throw error;
      } finally {
        isLoadingDetail.value = false;
        loadDeviceInFlight = null;
        loadDeviceInFlightId = null;
      }
    })();

    return loadDeviceInFlight;
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
    const created = filmDeviceSchema.parse(await readApiData(response));
    currentDevice.value = created;
    try {
      await loadDevices();
    } catch {
      const existing = devices.value.some((item) => item.id === created.id);
      if (!existing) {
        devices.value = [...devices.value, created];
      }
    }
  }

  async function updateDevice(id: number, input: UpdateFilmDeviceRequest): Promise<void> {
    const response = await request(`/api/v1/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    const updated = filmDeviceSchema.parse(await readApiData(response));
    currentDevice.value = updated;
    try {
      await loadDevices();
    } catch {
      devices.value = devices.value.map((item) => (item.id === id ? updated : item));
    }
  }

  async function deleteDevice(id: number): Promise<void> {
    await request(`/api/v1/devices/${id}`, { method: 'DELETE' });
    currentDevice.value = null;
    currentSlots.value = [];
    currentLoadEvents.value = [];
    try {
      await loadDevices();
    } catch {
      devices.value = devices.value.filter((item) => item.id !== id);
    }
  }

  return {
    devices,
    currentDevice,
    currentSlots,
    currentLoadEvents,
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
