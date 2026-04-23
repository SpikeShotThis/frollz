<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NSelect,
  NTag,
  NText
} from 'naive-ui';
import type { CreateFilmDeviceRequest } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useReferenceStore } from '../stores/reference.js';
import { useDeviceStore } from '../stores/devices.js';
import PageShell from '../components/PageShell.vue';
import MiniDashboardLayout from '../components/MiniDashboardLayout.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();
const feedback = useUiFeedback();
const route = useRoute();

const isCreateDrawerOpen = ref(false);
const isCreatingDevice = ref(false);
const pendingCreateKey = ref<string>(createIdempotencyKey());
const cameraDateAcquiredTimestamp = ref<number | null>(null);
const createState = ref<FormState>({ loading: false, fieldErrors: {}, formError: null });

const createForm = reactive({
  deviceTypeCode: null as string | null,
  filmFormatId: null as number | null,
  frameSize: '',
  make: '',
  model: '',
  serialNumber: '',
  loadMode: 'direct' as 'direct' | 'interchangeable_back' | 'film_holder',
  canUnload: true,
  cameraSystem: '',
  name: '',
  system: '',
  brand: '',
  slotCount: 1 as 1 | 2,
  holderTypeId: null as number | null
});

const deviceTypeTypeByCode: Record<string, 'default' | 'info' | 'primary'> = {
  camera: 'primary',
  interchangeable_back: 'info',
  film_holder: 'default'
};

const deviceTypeOptions = computed(() =>
  referenceStore.deviceTypes.map((entry) => ({ label: entry.label, value: entry.code }))
);
const filmFormatOptions = computed(() =>
  referenceStore.filmFormats.map((entry) => ({ label: entry.label, value: entry.id }))
);
const selectedFormatCode = computed(() => {
  if (!createForm.filmFormatId) {
    return null;
  }
  return referenceStore.filmFormats.find((entry) => entry.id === createForm.filmFormatId)?.code ?? null;
});
const frameSizeOptions = computed(() => {
  const code = selectedFormatCode.value;
  if (!code) {
    return [];
  }

  if (code === '35mm') {
    return [
      { label: 'Full Frame', value: 'full_frame' },
      { label: 'Half Frame', value: 'half_frame' }
    ];
  }

  if (code === '120' || code === '220') {
    return ['645', '6x6', '6x7', '6x8', '6x9', '6x12', '6x17'].map((value) => ({ label: value, value }));
  }

  if (code === '4x5' || code === '8x10' || code === '2x3') {
    return [{ label: code, value: code }];
  }

  if (code === 'InstaxMini' || code === 'InstaxWide' || code === 'InstaxSquare') {
    return [{ label: 'Instax', value: 'instax' }];
  }

  return [];
});
const holderTypeOptions = computed(() =>
  referenceStore.holderTypes.map((entry) => ({ label: entry.label, value: entry.id }))
);
const cameraLoadModeOptions = computed(() => [
  { label: 'Direct', value: 'direct' },
  { label: 'Interchangeable back', value: 'interchangeable_back' },
  { label: 'Film holder', value: 'film_holder' }
]);
const holderSlotCountOptions = computed(() => [
  { label: '1 slot', value: 1 },
  { label: '2 slots', value: 2 }
]);
const lockedDeviceType = computed(() =>
  typeof route.meta.deviceTypeFilter === 'string' ? route.meta.deviceTypeFilter : null
);
const filteredDevices = computed(() =>
  lockedDeviceType.value
    ? deviceStore.devices.filter((device) => device.deviceTypeCode === lockedDeviceType.value)
    : deviceStore.devices
);
const recentDevices = computed(() => filteredDevices.value.slice(-10));

const stats = computed(() => {
  const total = filteredDevices.value.length;

  return [
    { label: 'Total visible devices', value: total, helper: 'Current route scope' },
    {
      label: 'Cameras',
      value: filteredDevices.value.filter((device) => device.deviceTypeCode === 'camera').length,
      helper: 'Body-level capture devices'
    },
    {
      label: 'Interchangeable backs',
      value: filteredDevices.value.filter((device) => device.deviceTypeCode === 'interchangeable_back').length,
      helper: 'Modular backs and magazines'
    },
    {
      label: 'Film holders',
      value: filteredDevices.value.filter((device) => device.deviceTypeCode === 'film_holder').length,
      helper: 'Sheet and holder systems'
    }
  ];
});

const pageSubtitle = computed(() =>
  lockedDeviceType.value
    ? 'Dashboard filtered by device category selected in navigation.'
    : 'Manage cameras, interchangeable backs, and holders in a compact dashboard.'
);

function validateCreateForm(): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!createForm.deviceTypeCode) {
    errors.deviceTypeCode = 'Device type is required.';
  }
  if (!createForm.filmFormatId) {
    errors.filmFormatId = 'Film format is required.';
  }
  if (!createForm.frameSize) {
    errors.frameSize = 'Frame size is required.';
  }

  if (createForm.deviceTypeCode === 'camera') {
    if (!createForm.make.trim()) {
      errors.make = 'Camera make is required.';
    }
    if (!createForm.model.trim()) {
      errors.model = 'Camera model is required.';
    }
    if (createForm.loadMode === 'interchangeable_back' && !createForm.cameraSystem.trim()) {
      errors.cameraSystem = 'Camera system is required for interchangeable back cameras.';
    }
  }

  if (createForm.deviceTypeCode === 'interchangeable_back') {
    if (!createForm.name.trim()) {
      errors.name = 'Back name is required.';
    }
    if (!createForm.system.trim()) {
      errors.system = 'System is required.';
    }
  }

  if (createForm.deviceTypeCode === 'film_holder') {
    if (!createForm.name.trim()) {
      errors.name = 'Holder name is required.';
    }
    if (!createForm.brand.trim()) {
      errors.brand = 'Brand is required.';
    }
    if (!createForm.holderTypeId) {
      errors.holderTypeId = 'Holder type is required.';
    }
  }

  return errors;
}

function deviceDetail(deviceId: number): string {
  const device = filteredDevices.value.find((entry) => entry.id === deviceId);
  if (!device) {
    return '-';
  }

  if (device.deviceTypeCode === 'camera') {
    return `${device.make} ${device.model}`;
  }

  if (device.deviceTypeCode === 'interchangeable_back') {
    return `${device.name} · ${device.system}`;
  }

  return `${device.name} · ${device.brand} · ${device.holderTypeCode}`;
}

function resetCreateForm(): void {
  createForm.deviceTypeCode = null;
  createForm.filmFormatId = null;
  createForm.frameSize = '';
  createForm.make = '';
  createForm.model = '';
  createForm.serialNumber = '';
  createForm.loadMode = 'direct';
  createForm.canUnload = true;
  createForm.cameraSystem = '';
  createForm.name = '';
  createForm.system = '';
  createForm.brand = '';
  createForm.slotCount = 1;
  createForm.holderTypeId = null;
  cameraDateAcquiredTimestamp.value = null;
  createState.value.fieldErrors = {};
  createState.value.formError = null;
}

async function refresh(): Promise<void> {
  try {
    await deviceStore.loadDevices();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load devices.'));
  }
}

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
    await refresh();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load devices.'));
  }
});

function openCreateDrawer(): void {
  pendingCreateKey.value = createIdempotencyKey();
  isCreateDrawerOpen.value = true;
}

async function submitCreateDevice(): Promise<void> {
  if (isCreatingDevice.value) {
    return;
  }

  createState.value.fieldErrors = validateCreateForm();
  if (Object.keys(createState.value.fieldErrors).length > 0) {
    createState.value.formError = 'Please complete required fields.';
    return;
  }

  const deviceType = referenceStore.deviceTypes.find((entry) => entry.code === createForm.deviceTypeCode);
  if (!deviceType) {
    createState.value.formError = 'Device type is not available.';
    return;
  }

  let payload: CreateFilmDeviceRequest;

  if (createForm.deviceTypeCode === 'camera') {
    payload = {
      deviceTypeCode: 'camera',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      make: createForm.make.trim(),
      model: createForm.model.trim(),
      loadMode: createForm.loadMode,
      canUnload: createForm.canUnload,
      cameraSystem: createForm.cameraSystem.trim() || null,
      serialNumber: createForm.serialNumber || null,
      dateAcquired: cameraDateAcquiredTimestamp.value ? new Date(cameraDateAcquiredTimestamp.value).toISOString() : null
    };
  } else if (createForm.deviceTypeCode === 'interchangeable_back') {
    payload = {
      deviceTypeCode: 'interchangeable_back',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      name: createForm.name.trim(),
      system: createForm.system.trim()
    };
  } else {
    payload = {
      deviceTypeCode: 'film_holder',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize as CreateFilmDeviceRequest['frameSize'],
      name: createForm.name.trim(),
      brand: createForm.brand.trim(),
      slotCount: createForm.slotCount,
      holderTypeId: createForm.holderTypeId as number
    };
  }

  isCreatingDevice.value = true;
  createState.value.loading = true;
  createState.value.formError = null;

  try {
    await deviceStore.createDevice(payload, pendingCreateKey.value);
    isCreateDrawerOpen.value = false;
    pendingCreateKey.value = createIdempotencyKey();
    resetCreateForm();
    feedback.success('Device added successfully.');
  } catch (error) {
    createState.value.formError = feedback.toErrorMessage(error, 'Could not create device.');
  } finally {
    isCreatingDevice.value = false;
    createState.value.loading = false;
  }
}
</script>

<template>
  <PageShell title="Devices" :subtitle="pageSubtitle">
    <template #actions>
      <NButton type="primary" @click="openCreateDrawer">Add device</NButton>
      <NButton tertiary @click="refresh">Refresh</NButton>
    </template>

    <NAlert v-if="deviceStore.listError" type="error" :show-icon="true">
      {{ deviceStore.listError }}
    </NAlert>

    <MiniDashboardLayout left-panel-title="Recently added devices" right-panel-title="Device statistics">
      <template #left>
        <NCard :loading="deviceStore.isLoading">
          <NEmpty
            v-if="!deviceStore.isLoading && recentDevices.length === 0"
            description="No devices found."
          />
          <NFlex v-else vertical size="small">
            <NCard v-for="device in recentDevices" :key="device.id" size="small" embedded>
              <NFlex justify="space-between" align="center" :wrap="false">
                <NTag size="small" :type="deviceTypeTypeByCode[device.deviceTypeCode] ?? 'default'">
                  {{ device.deviceTypeCode.replace('_', ' ') }}
                </NTag>
                <NText depth="3">
                  {{ referenceStore.filmFormats.find((format) => format.id === device.filmFormatId)?.code ?? device.filmFormatId }}
                  ·
                  {{ device.frameSize }}
                </NText>
              </NFlex>
              <NText strong>{{ deviceDetail(device.id) }}</NText>
            </NCard>
          </NFlex>
        </NCard>
      </template>

      <template #right>
        <NCard v-for="card in stats" :key="card.label" size="small">
          <NFlex vertical size="small">
            <NText depth="3">{{ card.label }}</NText>
            <NText style="font-size: 1.45rem; font-weight: 700;">{{ card.value }}</NText>
            <NText depth="3">{{ card.helper }}</NText>
          </NFlex>
        </NCard>
      </template>
    </MiniDashboardLayout>
  </PageShell>

  <NDrawer :show="isCreateDrawerOpen" placement="right" width="min(100vw, 440px)" @update:show="(value) => { isCreateDrawerOpen = value; }">
    <NDrawerContent title="Add device" closable>
      <NForm label-placement="top" @submit.prevent="submitCreateDevice">
        <NAlert v-if="createState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ createState.formError }}
        </NAlert>

        <NFormItem
          label="Device type"
          required
          :label-props="{ for: 'device-create-type-input' }"
          :feedback="createState.fieldErrors.deviceTypeCode || ''"
        >
          <NSelect
            :value="createForm.deviceTypeCode"
            :options="deviceTypeOptions"
            :input-props="{ id: 'device-create-type-input', name: 'deviceTypeCode' }"
            @update:value="(value) => { createForm.deviceTypeCode = value; }"
          />
        </NFormItem>
        <NFormItem
          label="Film format"
          required
          :label-props="{ for: 'device-create-format-input' }"
          :feedback="createState.fieldErrors.filmFormatId || ''"
        >
          <NSelect
            :value="createForm.filmFormatId"
            :options="filmFormatOptions"
            :input-props="{ id: 'device-create-format-input', name: 'filmFormatId' }"
            @update:value="(value) => { createForm.filmFormatId = value; }"
          />
        </NFormItem>
        <NFormItem
          label="Frame size"
          required
          :label-props="{ for: 'device-create-frame-size-input' }"
          :feedback="createState.fieldErrors.frameSize || ''"
        >
          <NSelect
            :value="createForm.frameSize"
            :options="frameSizeOptions"
            placeholder="Select frame size"
            :input-props="{ id: 'device-create-frame-size-input', name: 'frameSize' }"
            @update:value="(value) => { createForm.frameSize = value; }"
          />
        </NFormItem>

        <template v-if="createForm.deviceTypeCode === 'camera'">
          <NFormItem label="Make" required :label-props="{ for: 'device-create-make-input' }" :feedback="createState.fieldErrors.make || ''">
            <NInput
              :value="createForm.make"
              :input-props="{ id: 'device-create-make-input', name: 'make' }"
              @update:value="(value) => { createForm.make = value; }"
            />
          </NFormItem>
          <NFormItem label="Model" required :label-props="{ for: 'device-create-model-input' }" :feedback="createState.fieldErrors.model || ''">
            <NInput
              :value="createForm.model"
              :input-props="{ id: 'device-create-model-input', name: 'model' }"
              @update:value="(value) => { createForm.model = value; }"
            />
          </NFormItem>
          <NFormItem label="Serial number" :label-props="{ for: 'device-create-serial-input' }">
            <NInput
              :value="createForm.serialNumber"
              :input-props="{ id: 'device-create-serial-input', name: 'serialNumber' }"
              @update:value="(value) => { createForm.serialNumber = value; }"
            />
          </NFormItem>
          <NFormItem label="Load mode" :label-props="{ for: 'device-create-load-mode-input' }">
            <NSelect
              :value="createForm.loadMode"
              :options="cameraLoadModeOptions"
              :input-props="{ id: 'device-create-load-mode-input', name: 'loadMode' }"
              @update:value="(value) => { createForm.loadMode = value; }"
            />
          </NFormItem>
          <NFormItem label="Can unload film">
            <NSwitch
              :value="createForm.canUnload"
              @update:value="(value) => { createForm.canUnload = value; }"
            />
          </NFormItem>
          <NFormItem
            v-if="createForm.loadMode === 'interchangeable_back'"
            label="Camera system"
            :label-props="{ for: 'device-create-camera-system-input' }"
          >
            <NInput
              :value="createForm.cameraSystem"
              :input-props="{ id: 'device-create-camera-system-input', name: 'cameraSystem' }"
              @update:value="(value) => { createForm.cameraSystem = value; }"
            />
          </NFormItem>
          <NFormItem label="Date acquired" :label-props="{ for: 'device-create-date-acquired-input' }">
            <NDatePicker
              :value="cameraDateAcquiredTimestamp"
              type="datetime"
              clearable
              :input-props="{ id: 'device-create-date-acquired-input', name: 'dateAcquired' }"
              @update:value="(value) => { cameraDateAcquiredTimestamp = value; }"
            />
          </NFormItem>
        </template>

        <template v-if="createForm.deviceTypeCode === 'interchangeable_back'">
          <NFormItem label="Name" required :label-props="{ for: 'device-create-back-name-input' }" :feedback="createState.fieldErrors.name || ''">
            <NInput
              :value="createForm.name"
              :input-props="{ id: 'device-create-back-name-input', name: 'name' }"
              @update:value="(value) => { createForm.name = value; }"
            />
          </NFormItem>
          <NFormItem label="System" required :label-props="{ for: 'device-create-system-input' }" :feedback="createState.fieldErrors.system || ''">
            <NInput
              :value="createForm.system"
              :input-props="{ id: 'device-create-system-input', name: 'system' }"
              @update:value="(value) => { createForm.system = value; }"
            />
          </NFormItem>
        </template>

        <template v-if="createForm.deviceTypeCode === 'film_holder'">
          <NFormItem label="Name" required :label-props="{ for: 'device-create-holder-name-input' }" :feedback="createState.fieldErrors.name || ''">
            <NInput
              :value="createForm.name"
              :input-props="{ id: 'device-create-holder-name-input', name: 'name' }"
              @update:value="(value) => { createForm.name = value; }"
            />
          </NFormItem>
          <NFormItem label="Brand" required :label-props="{ for: 'device-create-holder-brand-input' }" :feedback="createState.fieldErrors.brand || ''">
            <NInput
              :value="createForm.brand"
              :input-props="{ id: 'device-create-holder-brand-input', name: 'brand' }"
              @update:value="(value) => { createForm.brand = value; }"
            />
          </NFormItem>
          <NFormItem
            label="Holder type"
            required
            :label-props="{ for: 'device-create-holder-type-input' }"
            :feedback="createState.fieldErrors.holderTypeId || ''"
          >
            <NSelect
              :value="createForm.holderTypeId"
              :options="holderTypeOptions"
              :input-props="{ id: 'device-create-holder-type-input', name: 'holderTypeId' }"
              @update:value="(value) => { createForm.holderTypeId = value; }"
            />
          </NFormItem>
          <NFormItem label="Slot count" :label-props="{ for: 'device-create-holder-slot-count-input' }">
            <NSelect
              :value="createForm.slotCount"
              :options="holderSlotCountOptions"
              :input-props="{ id: 'device-create-holder-slot-count-input', name: 'slotCount' }"
              @update:value="(value) => { createForm.slotCount = value; }"
            />
          </NFormItem>
        </template>

        <NFlex justify="end">
          <NButton tertiary @click="isCreateDrawerOpen = false">Cancel</NButton>
          <NButton type="primary" attr-type="submit" :loading="isCreatingDevice" :disabled="isCreatingDevice">
            Create device
          </NButton>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>
</template>
