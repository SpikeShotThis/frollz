<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRegleSchema } from '@regle/schemas';
import type { CreateFilmJourneyEventRequest } from '@frollz2/schema';
import { z } from 'zod';
import { idSchema } from '@frollz2/schema';
import { useDeviceStore } from '../../stores/devices.js';
import { useReferenceStore } from '../../stores/reference.js';

interface Props {
  occurredAt: string;
  notes: string;
  isSubmitting: boolean;
  filmFormatId: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ submit: [payload: CreateFilmJourneyEventRequest] }>();

const deviceStore = useDeviceStore();
const referenceStore = useReferenceStore();

const form = reactive({
  deviceId: undefined as number | undefined,
  slotNumber: undefined as 1 | 2 | undefined,
  intendedPushPull: undefined as number | undefined,
});

const loadedSchema = z.object({
  deviceId: idSchema,
  slotNumber: z.union([z.literal(1), z.literal(2)]).optional(),
  intendedPushPull: z.number().int().optional(),
});

const { r$ } = useRegleSchema(form, loadedSchema);

const deviceOptions = computed(() => {
  return deviceStore.devices
    .filter((d) => d.filmFormatId === props.filmFormatId)
    .map((d) => {
      const typeLabel = referenceStore.deviceTypes.find(
        (t) => t.code === d.deviceTypeCode
      )?.label ?? d.deviceTypeCode;
      let displayName = '';
      if (d.deviceTypeCode === 'camera') {
        displayName = `${d.make} ${d.model}`;
      } else {
        displayName = d.name;
      }
      return {
        label: `${displayName} (${typeLabel})`,
        value: d.id,
      };
    });
});

const selectedDevice = computed(() => {
  return deviceStore.devices.find((d) => d.id === form.deviceId);
});

const isFilmHolder = computed(() => selectedDevice.value?.deviceTypeCode === 'film_holder');

async function handleSubmit(): Promise<void> {
  if (!props.occurredAt) return;

  const { valid, data } = await r$.$validate();
  if (!valid) return;

  if (!selectedDevice.value) return;

  const device = selectedDevice.value;
  const payload: CreateFilmJourneyEventRequest = {
    filmStateCode: 'loaded',
    occurredAt: props.occurredAt,
    notes: props.notes || undefined,
    eventData: {},
  };

  if (device.deviceTypeCode === 'camera') {
    payload.eventData = {
      loadTargetType: 'camera_direct',
      cameraId: device.id,
      intendedPushPull: data.intendedPushPull ?? null,
    };
  } else if (device.deviceTypeCode === 'interchangeable_back') {
    payload.eventData = {
      loadTargetType: 'interchangeable_back',
      interchangeableBackId: device.id,
      intendedPushPull: data.intendedPushPull ?? null,
    };
  } else {
    payload.eventData = {
      loadTargetType: 'film_holder_slot',
      filmHolderId: device.id,
      slotNumber: data.slotNumber ?? 1,
      intendedPushPull: data.intendedPushPull ?? null,
    };
  }

  emit('submit', payload);
}
</script>

<template>
  <q-form class="column q-gutter-md" @submit="handleSubmit">
    <div>
      <q-select v-model="r$.$value.deviceId" filled emit-value map-options :options="deviceOptions" label="Device"
        :error="r$.deviceId.$error" :error-message="r$.deviceId.$errors[0]" />
    </div>

    <div v-if="isFilmHolder">
      <q-select v-model="r$.$value.slotNumber" filled :options="[1, 2]" label="Slot number"
        :error="r$.slotNumber?.$error" :error-message="r$.slotNumber?.$errors[0]" />
    </div>

    <div>
      <q-input v-model.number="r$.$value.intendedPushPull" filled type="number" label="Intended push/pull (optional)"
        :error="r$.intendedPushPull?.$error" :error-message="r$.intendedPushPull?.$errors[0]" />
    </div>

    <q-btn type="submit" color="primary" label="Add Event" :loading="isSubmitting" />
  </q-form>
</template>
