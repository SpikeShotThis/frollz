import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  referenceTablesSchema,
  type Emulsion,
  type FilmFormat,
  type FilmState,
  type HolderType,
  type PackageType,
  type ReceiverType,
  type ReferenceTables,
  type SlotState,
  type StorageLocation
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';

export const useReferenceStore = defineStore('reference', () => {
  const { request } = useApi();
  const filmFormats = ref<FilmFormat[]>([]);
  const developmentProcesses = ref<ReferenceTables['developmentProcesses']>([]);
  const packageTypes = ref<PackageType[]>([]);
  const filmStates = ref<FilmState[]>([]);
  const storageLocations = ref<StorageLocation[]>([]);
  const slotStates = ref<SlotState[]>([]);
  const receiverTypes = ref<ReceiverType[]>([]);
  const holderTypes = ref<HolderType[]>([]);
  const emulsions = ref<Emulsion[]>([]);

  const loaded = computed(() => filmFormats.value.length > 0);

  async function loadAll(): Promise<void> {
    const response = await request('/api/v1/reference');
    const referenceTables = referenceTablesSchema.parse(await response.json());

    filmFormats.value = referenceTables.filmFormats;
    developmentProcesses.value = referenceTables.developmentProcesses;
    packageTypes.value = referenceTables.packageTypes;
    filmStates.value = referenceTables.filmStates;
    storageLocations.value = referenceTables.storageLocations;
    slotStates.value = referenceTables.slotStates;
    receiverTypes.value = referenceTables.receiverTypes;
    holderTypes.value = referenceTables.holderTypes;
    emulsions.value = referenceTables.emulsions;
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
    receiverTypes,
    holderTypes,
    emulsions,
    loaded,
    loadAll,
    packageTypesByFormat
  };
});
