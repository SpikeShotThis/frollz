<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { QForm } from 'quasar';
import { FRAME_SIZE_CODES, getFrameSizeCodesForFormatCode, type CreateFilmDeviceRequest } from '@frollz2/schema';
import { useDeviceStore } from '../stores/devices.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../composables/idempotency.js';

const props = defineProps<{
  modelValue: boolean;
  deviceTypeFilter?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  created: [];
}>();

const deviceStore = useDeviceStore();
const referenceStore = useReferenceStore();
const feedback = useUiFeedback();
const isCreating = ref(false);
const deviceForm = ref<QForm | null>(null);
const idempotencyKey = ref(createIdempotencyKey());

const createForm = reactive({
  deviceTypeCode: props.deviceTypeFilter ?? 'camera',
  filmFormatId: null as number | null,
  frameSize: 'full_frame' as CreateFilmDeviceRequest['frameSize'],
  loadMode: 'direct' as 'direct' | 'interchangeable_back',
  make: '',
  model: '',
  name: '',
  system: '',
  brand: '',
  slotCount: 2,
  holderTypeId: null as number | null
});

const selectedFilmFormatCode = computed(() => {
  const selectedFilmFormat = referenceStore.filmFormats.find((format) => format.id === createForm.filmFormatId);
  return selectedFilmFormat?.code ?? null;
});

const frameSizeOptions = computed(() => {
  if (!selectedFilmFormatCode.value) {
    return [...FRAME_SIZE_CODES];
  }
  return [...getFrameSizeCodesForFormatCode(selectedFilmFormatCode.value)];
});

const isFieldDisabled = computed(() => !createForm.filmFormatId);

const isFrameSizeDisabled = computed(() =>
  isFieldDisabled.value ||
  (createForm.deviceTypeCode === 'camera' && createForm.loadMode !== 'direct')
);

const deviceTypeOptions = computed(() =>
  referenceStore.deviceTypes.map((type) => ({
    label: type.label,
    value: type.code
  }))
);

const filmFormatOptions = computed(() =>
  referenceStore.filmFormats.map((format) => ({
    label: format.label,
    value: format.id
  }))
);

const holderTypeOptions = computed(() =>
  referenceStore.holderTypes.map((type) => ({
    label: type.label,
    value: type.id
  }))
);

function reset(): void {
  createForm.deviceTypeCode = props.deviceTypeFilter ?? 'camera';
  createForm.filmFormatId = null;
  createForm.frameSize = FRAME_SIZE_CODES[0];
  createForm.loadMode = 'direct';
  createForm.make = '';
  createForm.model = '';
  createForm.name = '';
  createForm.system = '';
  createForm.brand = '';
  createForm.slotCount = 2;
  createForm.holderTypeId = null;
  idempotencyKey.value = createIdempotencyKey();
}

watch(frameSizeOptions, (options) => {
  if (options.length === 0) return;
  if (!options.includes(createForm.frameSize)) {
    const next = options[0];
    if (!next) return;
    createForm.frameSize = next;
  }
}, { immediate: true });

watch(() => props.modelValue, (open) => {
  if (open) reset();
});

async function submit(): Promise<void> {
  if (isCreating.value) return;

  const deviceType = referenceStore.deviceTypes.find((type) => type.code === createForm.deviceTypeCode);
  if (!deviceType) {
    feedback.error('Select a device type.');
    return;
  }

  let payload: CreateFilmDeviceRequest;

  if (createForm.deviceTypeCode === 'camera') {
    if (!createForm.make.trim() || !createForm.model.trim() || !createForm.filmFormatId) {
      feedback.error('Make, model, and format are required.');
      return;
    }
    payload = {
      deviceTypeCode: 'camera',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId,
      frameSize: createForm.loadMode === 'direct'
        ? createForm.frameSize as CreateFilmDeviceRequest['frameSize']
        : 'full_frame',
      make: createForm.make.trim(),
      model: createForm.model.trim(),
      canUnload: true,
      loadMode: createForm.loadMode
    };
  } else if (createForm.deviceTypeCode === 'interchangeable_back') {
    if (!createForm.name.trim() || !createForm.system.trim() || !createForm.filmFormatId) {
      feedback.error('Name, system, and format are required.');
      return;
    }
    payload = {
      deviceTypeCode: 'interchangeable_back',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      name: createForm.name.trim(),
      system: createForm.system.trim()
    };
  } else {
    if (!createForm.name.trim() || !createForm.brand.trim() || !createForm.holderTypeId || !createForm.filmFormatId) {
      feedback.error('Holder name, brand, holder type, and format are required.');
      return;
    }
    payload = {
      deviceTypeCode: 'film_holder',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      name: createForm.name.trim(),
      brand: createForm.brand.trim(),
      slotCount: createForm.slotCount as 1 | 2,
      holderTypeId: createForm.holderTypeId
    };
  }

  isCreating.value = true;
  try {
    await deviceStore.createDevice(payload, idempotencyKey.value);
    feedback.success('Device created.');
    emit('update:modelValue', false);
    emit('created');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to create device.'));
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="full-width">
      <q-card-section>
        <div class="text-h6">Create device</div>
      </q-card-section>

      <q-card-section>
        <q-form ref="deviceForm" class="column q-gutter-md" @submit="submit">
          <q-select
            v-model="createForm.deviceTypeCode"
            filled
            emit-value
            map-options
            :options="deviceTypeOptions"
            label="Device type"
            :disable="!!deviceTypeFilter"
          />
          <q-select
            v-model="createForm.filmFormatId"
            filled
            emit-value
            map-options
            :options="filmFormatOptions"
            label="Film format"
          />
          <q-select
            v-model="createForm.frameSize"
            filled
            :options="frameSizeOptions"
            label="Frame size"
            :disable="isFrameSizeDisabled"
          />

          <template v-if="createForm.deviceTypeCode === 'camera'">
            <q-toggle
              v-model="createForm.loadMode"
              true-value="direct"
              false-value="interchangeable_back"
              label="Is this camera directly loadable?"
              :disable="isFieldDisabled"
            />
            <q-input v-model="createForm.make" filled label="Make" :disable="isFieldDisabled" />
            <q-input v-model="createForm.model" filled label="Model" :disable="isFieldDisabled" />
          </template>

          <template v-else-if="createForm.deviceTypeCode === 'interchangeable_back'">
            <q-input v-model="createForm.name" filled label="Name" :disable="isFieldDisabled" />
            <q-input v-model="createForm.system" filled label="System" :disable="isFieldDisabled" />
          </template>

          <template v-else>
            <q-input v-model="createForm.name" filled label="Holder name" :disable="isFieldDisabled" />
            <q-input v-model="createForm.brand" filled label="Brand" :disable="isFieldDisabled" />
            <q-select
              v-model="createForm.slotCount"
              filled
              :options="[1, 2]"
              label="Slot count"
              :disable="isFieldDisabled"
            />
            <q-select
              v-model="createForm.holderTypeId"
              filled
              emit-value
              map-options
              :options="holderTypeOptions"
              label="Holder type"
              :disable="isFieldDisabled"
            />
          </template>
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="emit('update:modelValue', false)" />
        <q-btn color="primary" label="Create" :loading="isCreating" :disable="isCreating" @click="deviceForm?.submit()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
