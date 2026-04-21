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
import type { CreateFilmReceiverRequest, FilmReceiver, UpdateFilmReceiverRequest } from '@frollz2/schema';
import { createIdempotencyKey } from '../composables/idempotency.js';
import { useReferenceStore } from '../stores/reference.js';
import { useReceiverStore } from '../stores/receivers.js';
import PageShell from '../components/PageShell.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import type { FormState } from '../composables/ui-state.js';

const referenceStore = useReferenceStore();
const receiverStore = useReceiverStore();
const feedback = useUiFeedback();

const isCreateDrawerOpen = ref(false);
const isEditDrawerOpen = ref(false);
const selectedReceiverId = ref<number | null>(null);
const isCreatingReceiver = ref(false);
const isUpdatingReceiver = ref(false);

const cameraDateAcquiredTimestamp = ref<number | null>(null);
const editCameraDateAcquiredTimestamp = ref<number | null>(null);

const createState = ref<FormState>({ loading: false, fieldErrors: {}, formError: null });
const editState = ref<FormState>({ loading: false, fieldErrors: {}, formError: null });

const createForm = reactive({
  receiverTypeCode: null as string | null,
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

const receiverTypeTypeByCode: Record<string, 'default' | 'info' | 'primary'> = {
  camera: 'primary',
  interchangeable_back: 'info',
  film_holder: 'default'
};

const columns = computed<DataTableColumns<FilmReceiver>>(() => [
  { title: 'Type', key: 'receiverTypeCode', render: (row) => h(NTag, { type: receiverTypeTypeByCode[row.receiverTypeCode] ?? 'default' }, { default: () => row.receiverTypeCode.replace('_', ' ') }) },
  { title: 'Format', key: 'filmFormatId', render: (row) => referenceStore.filmFormats.find((format) => format.id === row.filmFormatId)?.code ?? String(row.filmFormatId) },
  { title: 'Frame Size', key: 'frameSize' },
  {
    title: 'Details',
    key: 'details',
    render: (row) => {
      if (row.receiverTypeCode === 'camera') {
        return `${row.make} ${row.model}`;
      }

      if (row.receiverTypeCode === 'interchangeable_back') {
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
              default: () => 'Delete this receiver?'
            }
          )
        ]
      })
  }
]);

const selectedReceiver = computed(() => receiverStore.currentReceiver);
const receiverTypeOptions = computed(() =>
  referenceStore.receiverTypes.map((entry) => ({ label: entry.label, value: entry.code }))
);
const filmFormatOptions = computed(() =>
  referenceStore.filmFormats.map((entry) => ({ label: entry.label, value: entry.id }))
);
const holderTypeOptions = computed(() =>
  referenceStore.holderTypes.map((entry) => ({ label: entry.label, value: entry.id }))
);

function validateCreateForm(): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!createForm.receiverTypeCode) {
    errors.receiverTypeCode = 'Receiver type is required.';
  }
  if (!createForm.filmFormatId) {
    errors.filmFormatId = 'Film format is required.';
  }
  if (!createForm.frameSize.trim()) {
    errors.frameSize = 'Frame size is required.';
  }

  if (createForm.receiverTypeCode === 'camera') {
    if (!createForm.make.trim()) {
      errors.make = 'Camera make is required.';
    }
    if (!createForm.model.trim()) {
      errors.model = 'Camera model is required.';
    }
  }

  if (createForm.receiverTypeCode === 'interchangeable_back') {
    if (!createForm.name.trim()) {
      errors.name = 'Back name is required.';
    }
    if (!createForm.system.trim()) {
      errors.system = 'System is required.';
    }
  }

  if (createForm.receiverTypeCode === 'film_holder') {
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
    await receiverStore.loadReceivers();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load receivers.'));
  }
});

async function handleRowClick(row: FilmReceiver): Promise<void> {
  selectedReceiverId.value = row.id;

  try {
    await receiverStore.loadReceiver(row.id);
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load receiver detail.'));
  }
}

function resetCreateForm(): void {
  createForm.receiverTypeCode = null;
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

async function submitCreateReceiver(): Promise<void> {
  if (isCreatingReceiver.value) {
    return;
  }

  createState.value.fieldErrors = validateCreateForm();
  if (Object.keys(createState.value.fieldErrors).length > 0) {
    createState.value.formError = 'Please complete required fields.';
    return;
  }

  const receiverType = referenceStore.receiverTypes.find((entry) => entry.code === createForm.receiverTypeCode);
  if (!receiverType) {
    createState.value.formError = 'Receiver type is not available.';
    return;
  }

  let payload: CreateFilmReceiverRequest;

  if (createForm.receiverTypeCode === 'camera') {
    payload = {
      receiverTypeCode: 'camera',
      receiverTypeId: receiverType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize.trim(),
      make: createForm.make.trim(),
      model: createForm.model.trim(),
      serialNumber: createForm.serialNumber || null,
      dateAcquired: cameraDateAcquiredTimestamp.value ? new Date(cameraDateAcquiredTimestamp.value).toISOString() : null
    };
  } else if (createForm.receiverTypeCode === 'interchangeable_back') {
    payload = {
      receiverTypeCode: 'interchangeable_back',
      receiverTypeId: receiverType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize.trim(),
      name: createForm.name.trim(),
      system: createForm.system.trim()
    };
  } else {
    payload = {
      receiverTypeCode: 'film_holder',
      receiverTypeId: receiverType.id,
      filmFormatId: createForm.filmFormatId as number,
      frameSize: createForm.frameSize.trim(),
      name: createForm.name.trim(),
      brand: createForm.brand.trim(),
      holderTypeId: createForm.holderTypeId as number
    };
  }

  isCreatingReceiver.value = true;
  createState.value.loading = true;
  createState.value.formError = null;

  try {
    await receiverStore.createReceiver(payload, createIdempotencyKey());
    isCreateDrawerOpen.value = false;
    resetCreateForm();
    feedback.success('Receiver added successfully.');
  } catch (error) {
    createState.value.formError = feedback.toErrorMessage(error, 'Could not create receiver.');
  } finally {
    isCreatingReceiver.value = false;
    createState.value.loading = false;
  }
}

async function openEditDrawer(receiver: FilmReceiver): Promise<void> {
  await handleRowClick(receiver);
  if (!receiverStore.currentReceiver) {
    return;
  }

  editState.value.fieldErrors = {};
  editState.value.formError = null;

  editForm.filmFormatId = receiverStore.currentReceiver.filmFormatId;
  editForm.frameSize = receiverStore.currentReceiver.frameSize;

  if (receiverStore.currentReceiver.receiverTypeCode === 'camera') {
    editForm.make = receiverStore.currentReceiver.make;
    editForm.model = receiverStore.currentReceiver.model;
    editForm.serialNumber = receiverStore.currentReceiver.serialNumber ?? '';
    editCameraDateAcquiredTimestamp.value = receiverStore.currentReceiver.dateAcquired
      ? Date.parse(receiverStore.currentReceiver.dateAcquired)
      : null;
  }

  if (receiverStore.currentReceiver.receiverTypeCode === 'interchangeable_back') {
    editForm.name = receiverStore.currentReceiver.name;
    editForm.system = receiverStore.currentReceiver.system;
  }

  if (receiverStore.currentReceiver.receiverTypeCode === 'film_holder') {
    editForm.name = receiverStore.currentReceiver.name;
    editForm.brand = receiverStore.currentReceiver.brand;
    editForm.holderTypeId = receiverStore.currentReceiver.holderTypeId;
  }

  isEditDrawerOpen.value = true;
}

async function submitEditReceiver(): Promise<void> {
  if (isUpdatingReceiver.value) {
    return;
  }

  if (!receiverStore.currentReceiver || !selectedReceiverId.value) {
    editState.value.formError = 'Select a receiver before editing.';
    return;
  }

  const payload: UpdateFilmReceiverRequest = {
    filmFormatId: editForm.filmFormatId ?? undefined,
    frameSize: editForm.frameSize || undefined,
    ...(receiverStore.currentReceiver.receiverTypeCode === 'camera'
      ? {
        make: editForm.make || undefined,
        model: editForm.model || undefined,
        serialNumber: editForm.serialNumber || null,
        dateAcquired: editCameraDateAcquiredTimestamp.value
          ? new Date(editCameraDateAcquiredTimestamp.value).toISOString()
          : null
      }
      : {}),
    ...(receiverStore.currentReceiver.receiverTypeCode === 'interchangeable_back'
      ? {
        name: editForm.name || undefined,
        system: editForm.system || undefined
      }
      : {}),
    ...(receiverStore.currentReceiver.receiverTypeCode === 'film_holder'
      ? {
        name: editForm.name || undefined,
        brand: editForm.brand || undefined,
        holderTypeId: editForm.holderTypeId ?? undefined
      }
      : {})
  };

  isUpdatingReceiver.value = true;
  editState.value.loading = true;
  editState.value.formError = null;

  try {
    await receiverStore.updateReceiver(selectedReceiverId.value, payload);
    if (selectedReceiverId.value) {
      await receiverStore.loadReceiver(selectedReceiverId.value);
    }
    isEditDrawerOpen.value = false;
    feedback.success('Receiver updated.');
  } catch (error) {
    editState.value.formError = feedback.toErrorMessage(error, 'Could not save changes.');
  } finally {
    isUpdatingReceiver.value = false;
    editState.value.loading = false;
  }
}

async function handleDelete(id: number): Promise<void> {
  try {
    await receiverStore.deleteReceiver(id);
    if (selectedReceiverId.value === id) {
      selectedReceiverId.value = null;
    }
    feedback.info('Receiver removed.');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not delete receiver.'));
  }
}
</script>

<template>
  <PageShell title="Receivers" subtitle="Manage cameras, interchangeable backs, and holders in one place.">
    <template #actions>
      <NButton type="primary" @click="isCreateDrawerOpen = true">Add receiver</NButton>
    </template>

    <NAlert v-if="receiverStore.listError" type="error" :show-icon="true">
      {{ receiverStore.listError }}
    </NAlert>

    <NGrid cols="1 1 2" x-gap="16" y-gap="16">
      <NGridItem>
        <NCard title="Inventory">
          <NDataTable :columns="columns" :data="receiverStore.receivers" :loading="receiverStore.isLoading" :row-key="(row) => row.id" />
          <NEmpty v-if="!receiverStore.isLoading && receiverStore.receivers.length === 0" description="No receivers found" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard title="Receiver detail">
          <NAlert v-if="receiverStore.detailError" type="error" :show-icon="true" style="margin-bottom: 10px;">
            {{ receiverStore.detailError }}
          </NAlert>
          <template v-if="selectedReceiver">
            <NFlex vertical size="medium">
              <NFlex justify="space-between" align="center">
                <NText strong>{{ selectedReceiver.receiverTypeCode }}</NText>
                <NButton @click="selectedReceiver && openEditDrawer(selectedReceiver)">Edit selected</NButton>
              </NFlex>
              <NText>
                Format: {{ referenceStore.filmFormats.find((format) => format.id === selectedReceiver?.filmFormatId)?.code ?? selectedReceiver?.filmFormatId ?? '-' }}
              </NText>
              <template v-if="selectedReceiver.receiverTypeCode === 'camera'">
                <NText>{{ selectedReceiver.make }} {{ selectedReceiver.model }}</NText>
              </template>
              <template v-else-if="selectedReceiver.receiverTypeCode === 'interchangeable_back'">
                <NText>{{ selectedReceiver.name }} · {{ selectedReceiver.system }}</NText>
              </template>
              <template v-else>
                <NText>{{ selectedReceiver.name }} · {{ selectedReceiver.brand }} · {{ selectedReceiver.holderTypeCode }}</NText>
                <NDataTable
                  :columns="[
                    { title: 'Side', key: 'sideNumber' },
                    { title: 'Slot State', key: 'slotStateCode' },
                    { title: 'Loaded Film', key: 'loadedFilmId' }
                  ]"
                  :data="receiverStore.currentSlots"
                  :row-key="(row) => row.id"
                />
              </template>
            </NFlex>
          </template>
          <NEmpty v-else description="Select a receiver to see its detail" />
        </NCard>
      </NGridItem>
    </NGrid>
  </PageShell>

  <NDrawer :show="isCreateDrawerOpen" placement="right" width="440" @update:show="(value) => { isCreateDrawerOpen = value; }">
    <NDrawerContent title="Add receiver" closable>
      <NForm label-placement="top" @submit.prevent="submitCreateReceiver">
        <NAlert v-if="createState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ createState.formError }}
        </NAlert>

        <NFormItem
          label="Receiver type"
          required
          :feedback="createState.fieldErrors.receiverTypeCode || ''"
        >
          <NSelect :value="createForm.receiverTypeCode" :options="receiverTypeOptions" @update:value="(value) => { createForm.receiverTypeCode = value; }" />
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

        <template v-if="createForm.receiverTypeCode === 'camera'">
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

        <template v-if="createForm.receiverTypeCode === 'interchangeable_back'">
          <NFormItem label="Name" required :feedback="createState.fieldErrors.name || ''">
            <NInput :value="createForm.name" @update:value="(value) => { createForm.name = value; }" />
          </NFormItem>
          <NFormItem label="System" required :feedback="createState.fieldErrors.system || ''">
            <NInput :value="createForm.system" @update:value="(value) => { createForm.system = value; }" />
          </NFormItem>
        </template>

        <template v-if="createForm.receiverTypeCode === 'film_holder'">
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
          <NButton type="primary" attr-type="submit" :loading="isCreatingReceiver" :disabled="isCreatingReceiver">
            Create receiver
          </NButton>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>

  <NDrawer :show="isEditDrawerOpen" placement="right" width="440" @update:show="(value) => { isEditDrawerOpen = value; }">
    <NDrawerContent title="Edit receiver" closable>
      <NForm v-if="receiverStore.currentReceiver" label-placement="top" @submit.prevent="submitEditReceiver">
        <NAlert v-if="editState.formError" type="error" :show-icon="true" style="margin-bottom: 10px;">
          {{ editState.formError }}
        </NAlert>

        <NFormItem label="Film format">
          <NSelect :value="editForm.filmFormatId" :options="filmFormatOptions" @update:value="(value) => { editForm.filmFormatId = value; }" />
        </NFormItem>
        <NFormItem label="Frame size">
          <NInput :value="editForm.frameSize" @update:value="(value) => { editForm.frameSize = value; }" />
        </NFormItem>

        <template v-if="receiverStore.currentReceiver.receiverTypeCode === 'camera'">
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

        <template v-if="receiverStore.currentReceiver.receiverTypeCode === 'interchangeable_back'">
          <NFormItem label="Name">
            <NInput :value="editForm.name" @update:value="(value) => { editForm.name = value; }" />
          </NFormItem>
          <NFormItem label="System">
            <NInput :value="editForm.system" @update:value="(value) => { editForm.system = value; }" />
          </NFormItem>
        </template>

        <template v-if="receiverStore.currentReceiver.receiverTypeCode === 'film_holder'">
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
          <NButton type="primary" attr-type="submit" :loading="isUpdatingReceiver" :disabled="isUpdatingReceiver">
            Save changes
          </NButton>
        </NFlex>
      </NForm>
    </NDrawerContent>
  </NDrawer>
</template>
