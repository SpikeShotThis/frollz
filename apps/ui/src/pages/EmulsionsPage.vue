<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { NAlert, NCard, NDataTable, NEmpty } from 'naive-ui';
import type { Emulsion } from '@frollz2/schema';
import { useReferenceStore } from '../stores/reference.js';
import PageShell from '../components/PageShell.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';

const referenceStore = useReferenceStore();
const feedback = useUiFeedback();

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load emulsion references.'));
  }
});

const columns = [
  { title: 'Brand', key: 'brand' },
  { title: 'Manufacturer', key: 'manufacturer' },
  { title: 'ISO', key: 'isoSpeed' },
  { title: 'Process', key: 'developmentProcess' }
];

const data = computed(() =>
  referenceStore.emulsions.map((emulsion: Emulsion) => ({
    brand: emulsion.brand,
    manufacturer: emulsion.manufacturer,
    isoSpeed: emulsion.isoSpeed,
    developmentProcess: emulsion.developmentProcess.label
  }))
);
</script>

<template>
  <PageShell title="Emulsions" subtitle="Reference list for available film stocks and processing methods.">
    <NCard>
      <NAlert v-if="referenceStore.loadError" type="error" :show-icon="true" style="margin-bottom: 10px;">
        {{ referenceStore.loadError }}
      </NAlert>
      <NDataTable :columns="columns" :data="data" :loading="referenceStore.isLoading" />
      <NEmpty v-if="!referenceStore.isLoading && data.length === 0" description="No emulsions are available." />
    </NCard>
  </PageShell>
</template>
