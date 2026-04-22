import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  referenceTablesSchema,
  type Emulsion,
  type FilmFormat,
  type FilmState,
  type HolderType,
  type PackageType,
  type DeviceType,
  type ReferenceTables,
  type SlotState,
  type StorageLocation
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useReferenceStore = defineStore('reference', () => {
  const { request } = useApi();
  const filmFormats = ref<FilmFormat[]>([]);
  const developmentProcesses = ref<ReferenceTables['developmentProcesses']>([]);
  const packageTypes = ref<PackageType[]>([]);
  const filmStates = ref<FilmState[]>([]);
  const storageLocations = ref<StorageLocation[]>([]);
  const slotStates = ref<SlotState[]>([]);
  const deviceTypes = ref<DeviceType[]>([]);
  const holderTypes = ref<HolderType[]>([]);
  const emulsions = ref<Emulsion[]>([]);

  const loaded = computed(() => filmFormats.value.length > 0);
  const isLoading = ref(false);
  const loadError = ref<string | null>(null);
  let loadAllInFlight: Promise<void> | null = null;

  async function loadAll(): Promise<void> {
    if (loaded.value) {
      return;
    }

    if (loadAllInFlight) {
      return loadAllInFlight;
    }

    isLoading.value = true;
    loadError.value = null;
    loadAllInFlight = (async () => {
      try {
        const response = await request('/api/v1/reference');
        const referenceTables = referenceTablesSchema.parse(await readApiData(response));

        filmFormats.value = referenceTables.filmFormats;
        developmentProcesses.value = referenceTables.developmentProcesses;
        packageTypes.value = referenceTables.packageTypes;
        filmStates.value = referenceTables.filmStates;
        storageLocations.value = referenceTables.storageLocations;
        slotStates.value = referenceTables.slotStates;
        deviceTypes.value = referenceTables.deviceTypes;
        holderTypes.value = referenceTables.holderTypes;
        emulsions.value = referenceTables.emulsions;
      } catch (error) {
        loadError.value = error instanceof Error ? error.message : 'Failed to load reference data';
        throw error;
      } finally {
        isLoading.value = false;
        loadAllInFlight = null;
      }
    })();

    return loadAllInFlight;
  }

  function packageTypesByFormat(filmFormatId: number): PackageType[] {
    return packageTypes.value.filter((packageType) => packageType.filmFormatId === filmFormatId);
  }

  return {
    filmFormats,
    developmentProcesses,
    packageTypes,
    filmStates,
    storageLocations,
    slotStates,
    deviceTypes,
    holderTypes,
    emulsions,
    loaded,
    isLoading,
    loadError,
    loadAll,
    packageTypesByFormat
  };
});
