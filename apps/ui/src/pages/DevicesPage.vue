<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  NText
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { CreateFilmDeviceRequest, FilmDevice, UpdateFilmDeviceRequest } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useReferenceStore } from '../stores/reference.js';
import { useDeviceStore } from '../stores/devices.js';
import PageShell from '../components/PageShell.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();
const feedback = useUiFeedback();

const isCreateDrawerOpen = ref(false);
const isEditDrawerOpen = ref(false);
const selectedDeviceId = ref<number | null>(null);
const isCreatingDevice = ref(false);
const isUpdatingDevice = ref(false);

const cameraDateAcquiredTimestamp = ref<number | null>(null);
const editCameraDateAcquiredTimestamp = ref<number | null>(null);

const createState = ref<FormState>({ loading: false, fieldErrors: {}, formError: null });
const editState = ref<FormState>({ loading: false, fieldErrors: {}, formError: null });

const createForm = reactive({
  deviceTypeCode: null as string | null,
  filmFormatId: null as number | null,
  frameSize: '',
  make: '',
  model: '',
  serialNumber: '',
  name: '',
  system: '',
  brand: '',
  holderTypeId: null as number | null
});

const editForm = reactive({
  filmFormatId: null as number | null,
  frameSize: '',
  make: '',
  model: '',
  serialNumber: '',
  name: '',
  system: '',
  brand: '',
  holderTypeId: null as number | null
});

const deviceTypeTypeByCode: Record<string, 'default' | 'info' | 'primary'> = {
  camera: 'primary',
  interchangeable_back: 'info',
  film_holder: 'default'
};

const columns = computed<DataTableColumns<FilmDevice>>(() => [
  { title: 'Type', key: 'deviceTypeCode', render: (row) => h(NTag, { type: deviceTypeTypeByCode[row.deviceTypeCode] ?? 'default' }, { default: () => row.deviceTypeCode.replace('_', ' ') }) },
  { title: 'Format', key: 'filmFormatId', render: (row) => referenceStore.filmFormats.find((format) => format.id === row.filmFormatId)?.code ?? String(row.filmFormatId) },
  { title: 'Frame Size', key: 'frameSize' },
  {
    title: 'Details',
    key: 'details',
    render: (row) => {
      if (row.deviceTypeCode === 'camera') {
        return `${row.make} ${row.model}`;
      }

      if (row.deviceTypeCode === 'interchangeable_back') {
        return `${row.name} · ${row.system}`;
      }

      return `${row.name} · ${row.brand} · ${row.holderTypeCode}`;
    }
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (row) =>
      h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              tertiary: true,
              onClick: () => {
                void handleRowClick(row);
              }
            },
            { default: () => 'View' }
          ),
          h(
            NButton,
            {
              size: 'small',
              onClick: () => {
                void openEditDrawer(row);
              }
            },
            { default: () => 'Edit' }
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => {
                void handleDelete(row.id);
              }
            },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => 'Delete' }),
              default: () => 'Delete this device?'
            }
          )
        ]
      })
  }
]);

const selectedDevice = computed(() => deviceStore.currentDevice);
const deviceTypeOptions = computed(() =>
  referenceStore.deviceTypes.map((entry) => ({ label: entry.label, value: entry.code }))
);
const filmFormatOptions = computed(() =>
  referenceStore.filmFormats.map((entry) => ({ label: entry.label, value: entry.id }))
);
const holderTypeOptions = computed(() =>
  referenceStore.holderTypes.map((entry) => ({ label: entry.label, value: entry.id }))
);

function validateCreateForm(): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!createForm.deviceTypeCode) {
    errors.deviceTypeCode = 'Device type is required.';
  }
  if (!createForm.filmFormatId) {
    errors.filmFormatId = 'Film format is required.';
  }
  if (!createForm.frameSize.trim()) {
    errors.frameSize = 'Frame size is required.';
  }

  if (createForm.deviceTypeCode === 'camera') {
    if (!createForm.make.trim()) {
      errors.make = 'Camera make is required.';
    }
    if (!createForm.model.trim()) {
      errors.model = 'Camera model is required.';
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

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
    await deviceStore.loadDevices();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load devices.'));
  }
});

async function handleRowClick(row: FilmDevice): Promise<void> {
  selectedDeviceId.value = row.id;

  try {
    await deviceStore.loadDevice(row.id);
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load device detail.'));
  }
}

function resetCreateForm(): void {
  createForm.deviceTypeCode = null;
  createForm.filmFormatId = null;
  createForm.frameSize = '';
  createForm.make = '';
  createForm.model = '';
  createForm.serialNumber = '';
  createForm.name = '';
  createForm.system = '';
  createForm.brand = '';
  createForm.holderTypeId = null;
  cameraDateAcquiredTimestamp.value = null;
  createState.value.fieldErrors = {};
  createState.value.formError = null;
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
      frameSize: createForm.frameSize.trim(),
      make: createForm.make.trim(),
      model: createForm.model.trim(),
      serialNumber: createForm.serialNumber || null,
      dateAcquired: cameraDateAcquiredTimestamp.value ? new Date(cameraDateAcquiredTimestamp.value).toISOString() : null
    };
  } else if (createForm.deviceTypeCode === 'interchangeable_back') {
    payload = {
      deviceTypeCode: 'interchangeable_back',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize.trim(),
      name: createForm.name.trim(),
      system: createForm.system.trim()
    };
  } else {
    payload = {
      deviceTypeCode: 'film_holder',
      deviceTypeId: deviceType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize.trim(),
      name: createForm.name.trim(),
      brand: createForm.brand.trim(),
      holderTypeId: createForm.holderTypeId as number
    };
  }

  isCreatingDevice.value = true;
  createState.value.loading = true;
  createState.value.formError = null;

  try {
    await deviceStore.createDevice(payload, createIdempotencyKey());
    isCreateDrawerOpen.value = false;
    resetCreateForm();
    feedback.success('Device added successfully.');
  } catch (error) {
    createState.value.formError = feedback.toErrorMessage(error, 'Could not create device.');
  } finally {
    isCreatingDevice.value = false;
    createState.value.loading = false;
  }
}

async function openEditDrawer(device: FilmDevice): Promise<void> {
  await handleRowClick(device);
  if (!deviceStore.currentDevice) {
    return;
  }

  editState.value.fieldErrors = {};
  editState.value.formError = null;

  editForm.filmFormatId = deviceStore.currentDevice.filmFormatId;
  editForm.frameSize = deviceStore.currentDevice.frameSize;

  if (deviceStore.currentDevice.deviceTypeCode === 'camera') {
    editForm.make = deviceStore.currentDevice.make;
    editForm.model = deviceStore.currentDevice.model;
    editForm.serialNumber = deviceStore.currentDevice.serialNumber ?? '';
    editCameraDateAcquiredTimestamp.value = deviceStore.currentDevice.dateAcquired
      ? Date.parse(deviceStore.currentDevice.dateAcquired)
      : null;
  }

  if (deviceStore.currentDevice.deviceTypeCode === 'interchangeable_back') {
    editForm.name = deviceStore.currentDevice.name;
    editForm.system = deviceStore.currentDevice.system;
  }

  if (deviceStore.currentDevice.deviceTypeCode === 'film_holder') {
    editForm.name = deviceStore.currentDevice.name;
    editForm.brand = deviceStore.currentDevice.brand;
    editForm.holderTypeId = deviceStore.currentDevice.holderTypeId;
  }

  isEditDrawerOpen.value = true;
}

async function submitEditDevice(): Promise<void> {
  if (isUpdatingDevice.value) {
    return;
  }

  if (!deviceStore.currentDevice || !selectedDeviceId.value) {
    editState.value.formError = 'Select a device before editing.';
    return;
  }

  const payload: UpdateFilmDeviceRequest = {
    filmFormatId: editForm.filmFormatId ?? undefined,
    frameSize: editForm.frameSize || undefined,
    ...(deviceStore.currentDevice.deviceTypeCode === 'camera'
      ? {
        make: editForm.make || undefined,
        model: editForm.model || undefined,
        serialNumber: editForm.serialNumber || null,
        dateAcquired: editCameraDateAcquiredTimestamp.value
          ? new Date(editCameraDateAcquiredTimestamp.value).toISOString()
          : null
      }
      : {}),
    ...(deviceStore.currentDevice.deviceTypeCode === 'interchangeable_back'
      ? {
        name: editForm.name || undefined,
        system: editForm.system || undefined
      }
      : {}),
    ...(deviceStore.currentDevice.deviceTypeCode === 'film_holder'
      ? {
        name: editForm.name || undefined,
        brand: editForm.brand || undefined,
        holderTypeId: editForm.holderTypeId ?? undefined
      }
      : {})
  };

  isUpdatingDevice.value = true;
  editState.value.loading = true;
  editState.value.formError = null;

  try {
    await deviceStore.updateDevice(selectedDeviceId.value, payload);
    if (selectedDeviceId.value) {
      await deviceStore.loadDevice(selectedDeviceId.value);
    }
    isEditDrawerOpen.value = false;
    feedback.success('Device updated.');
  } catch (error) {
    editState.value.formError = feedback.toErrorMessage(error, 'Could not save changes.');
  } finally {
    isUpdatingDevice.value = false;
    editState.value.loading = false;
  }
}

async function handleDelete(id: number): Promise<void> {
  try {
    await deviceStore.deleteDevice(id);
    if (selectedDeviceId.value === id) {
      selectedDeviceId.value = null;
    }
    feedback.info('Device removed.');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not delete device.'));
  }
}
</script>

<template>
  <PageShell title="Devices" subtitle="Manage cameras, interchangeable backs, and holders in one place.">
    <template #actions>
      <NButton type="primary" @click="isCreateDrawerOpen = true">Add device</NButton>
    </template>

    <NAlert v-if="deviceStore.listError" type="error" :show-icon="true">
      {{ deviceStore.listError }}
    </NAlert>

    <NGrid cols="1 1 2" x-gap="16" y-gap="16">
      <NGridItem>
        <NCard title="Inventory">
          <NDataTable :columns="columns" :data="deviceStore.devices" :loading="deviceStore.isLoading" :row-key="(row) => row.id" />
          <NEmpty v-if="!deviceStore.isLoading && deviceStore.devices.length === 0" description="No devices found" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard title="Device detail">
          <NAlert v-if="deviceStore.detailError" type="error" :show-icon="true" style="margin-bottom: 10px;">
            {{ deviceStore.detailError }}
          </NAlert>
          <template v-if="selectedDevice">
            <NFlex vertical size="medium">
              <NFlex justify="space-between" align="center">
                <NText strong>{{ selectedDevice.deviceTypeCode }}</NText>
                <NButton @click="selectedDevice && openEditDrawer(selectedDevice)">Edit selected</NButton>
              </NFlex>
              <NText>
                Format: {{ referenceStore.filmFormats.find((format) => format.id === selectedDevice?.filmFormatId)?.code ?? selectedDevice?.filmFormatId ?? '-' }}
              </NText>
              <template v-if="selectedDevice.deviceTypeCode === 'camera'">
                <NText>{{ selectedDevice.make }} {{ selectedDevice.model }}</NText>
              </template>
              <template v-else-if="selectedDevice.deviceTypeCode === 'interchangeable_back'">
                <NText>{{ selectedDevice.name }} · {{ selectedDevice.system }}</NText>
              </template>
              <template v-else>
                <NText>{{ selectedDevice.name }} · {{ selectedDevice.brand }} · {{ selectedDevice.holderTypeCode }}</NText>
                <NDataTable
                  :columns="[
                    { title: 'Side', key: 'sideNumber' },
                    { title: 'Slot State', key: 'slotStateCode' },
                    { title: 'Loaded Film', key: 'loadedFilmId' }
                  ]"
                  :data="deviceStore.currentSlots"
                  :row-key="(row) => row.id"
                />
              </template>
            </NFlex>
          </template>
          <NEmpty v-else description="Select a device to see its detail" />
        </NCard>
      </NGridItem>
    </NGrid>
  </PageShell>

  <NDrawer :show="isCreateDrawerOpen" placement="right" width="440" @update:show="(value) => { isCreateDrawerOpen = value; }">
    <NDrawerContent title="Add device" closable>
      <NForm label-placement="top" @submit.prevent="submitCreateDevice">
        <NAlert v-if="createState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ createState.formError }}
        </NAlert>

        <NFormItem
          label="Device type"
          required
          :feedback="createState.fieldErrors.deviceTypeCode || ''"
        >
          <NSelect :value="createForm.deviceTypeCode" :options="deviceTypeOptions" @update:value="(value) => { createForm.deviceTypeCode = value; }" />
        </NFormItem>
        <NFormItem
          label="Film format"
          required
          :feedback="createState.fieldErrors.filmFormatId || ''"
        >
          <NSelect :value="createForm.filmFormatId" :options="filmFormatOptions" @update:value="(value) => { createForm.filmFormatId = value; }" />
        </NFormItem>
        <NFormItem
          label="Frame size"
          required
          :feedback="createState.fieldErrors.frameSize || ''"
        >
          <NInput :value="createForm.frameSize" placeholder="36x24, 6x7, 4x5" @update:value="(value) => { createForm.frameSize = value; }" />
        </NFormItem>

        <template v-if="createForm.deviceTypeCode === 'camera'">
          <NFormItem label="Make" required :feedback="createState.fieldErrors.make || ''">
            <NInput :value="createForm.make" @update:value="(value) => { createForm.make = value; }" />
          </NFormItem>
          <NFormItem label="Model" required :feedback="createState.fieldErrors.model || ''">
            <NInput :value="createForm.model" @update:value="(value) => { createForm.model = value; }" />
          </NFormItem>
          <NFormItem label="Serial number">
            <NInput :value="createForm.serialNumber" @update:value="(value) => { createForm.serialNumber = value; }" />
          </NFormItem>
          <NFormItem label="Date acquired">
            <NDatePicker :value="cameraDateAcquiredTimestamp" type="datetime" clearable @update:value="(value) => { cameraDateAcquiredTimestamp = value; }" />
          </NFormItem>
        </template>

        <template v-if="createForm.deviceTypeCode === 'interchangeable_back'">
          <NFormItem label="Name" required :feedback="createState.fieldErrors.name || ''">
            <NInput :value="createForm.name" @update:value="(value) => { createForm.name = value; }" />
          </NFormItem>
          <NFormItem label="System" required :feedback="createState.fieldErrors.system || ''">
            <NInput :value="createForm.system" @update:value="(value) => { createForm.system = value; }" />
          </NFormItem>
        </template>

        <template v-if="createForm.deviceTypeCode === 'film_holder'">
          <NFormItem label="Name" required :feedback="createState.fieldErrors.name || ''">
            <NInput :value="createForm.name" @update:value="(value) => { createForm.name = value; }" />
          </NFormItem>
          <NFormItem label="Brand" required :feedback="createState.fieldErrors.brand || ''">
            <NInput :value="createForm.brand" @update:value="(value) => { createForm.brand = value; }" />
          </NFormItem>
          <NFormItem
            label="Holder type"
            required
            :feedback="createState.fieldErrors.holderTypeId || ''"
          >
            <NSelect :value="createForm.holderTypeId" :options="holderTypeOptions" @update:value="(value) => { createForm.holderTypeId = value; }" />
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

  <NDrawer :show="isEditDrawerOpen" placement="right" width="440" @update:show="(value) => { isEditDrawerOpen = value; }">
    <NDrawerContent title="Edit device" closable>
      <NForm v-if="deviceStore.currentDevice" label-placement="top" @submit.prevent="submitEditDevice">
        <NAlert v-if="editState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ editState.formError }}
        </NAlert>

        <NFormItem label="Film format">
          <NSelect :value="editForm.filmFormatId" :options="filmFormatOptions" @update:value="(value) => { editForm.filmFormatId = value; }" />
        </NFormItem>
        <NFormItem label="Frame size">
          <NInput :value="editForm.frameSize" @update:value="(value) => { editForm.frameSize = value; }" />
        </NFormItem>

        <template v-if="deviceStore.currentDevice.deviceTypeCode === 'camera'">
          <NFormItem label="Make">
            <NInput :value="editForm.make" @update:value="(value) => { editForm.make = value; }" />
          </NFormItem>
          <NFormItem label="Model">
            <NInput :value="editForm.model" @update:value="(value) => { editForm.model = value; }" />
          </NFormItem>
          <NFormItem label="Serial number">
            <NInput :value="editForm.serialNumber" @update:value="(value) => { editForm.serialNumber = value; }" />
          </NFormItem>
          <NFormItem label="Date acquired">
            <NDatePicker :value="editCameraDateAcquiredTimestamp" type="datetime" clearable @update:value="(value) => { editCameraDateAcquiredTimestamp = value; }" />
          </NFormItem>
        </template>

        <template v-if="deviceStore.currentDevice.deviceTypeCode === 'interchangeable_back'">
          <NFormItem label="Name">
            <NInput :value="editForm.name" @update:value="(value) => { editForm.name = value; }" />
          </NFormItem>
          <NFormItem label="System">
            <NInput :value="editForm.system" @update:value="(value) => { editForm.system = value; }" />
          </NFormItem>
        </template>

        <template v-if="deviceStore.currentDevice.deviceTypeCode === 'film_holder'">
          <NFormItem label="Name">
            <NInput :value="editForm.name" @update:value="(value) => { editForm.name = value; }" />
          </NFormItem>
          <NFormItem label="Brand">
            <NInput :value="editForm.brand" @update:value="(value) => { editForm.brand = value; }" />
          </NFormItem>
          <NFormItem label="Holder type">
            <NSelect :value="editForm.holderTypeId" :options="holderTypeOptions" @update:value="(value) => { editForm.holderTypeId = value; }" />
          </NFormItem>
        </template>

        <NFlex justify="end">
          <NButton tertiary @click="isEditDrawerOpen = false">Cancel</NButton>
          <NButton type="primary" attr-type="submit" :loading="isUpdatingDevice" :disabled="isUpdatingDevice">
            Save changes
          </NButton>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>
</template>
