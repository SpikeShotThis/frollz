<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NEmpty } from 'naive-ui';
import PageShell from '../components/PageShell.vue';
import EntityDetailHeaderCard from '../components/inventory/EntityDetailHeaderCard.vue';
import { useReferenceStore } from '../stores/reference.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';

const route = useRoute();
const router = useRouter();
const referenceStore = useReferenceStore();
const feedback = useUiFeedback();

const emulsionId = computed(() => Number(route.params.id));
const selectedEmulsion = computed(() => referenceStore.currentEmulsion);

const detailItems = computed(() => {
  if (!selectedEmulsion.value) {
    return [];
  }

  return [
    { label: 'Manufacturer', value: selectedEmulsion.value.manufacturer },
    { label: 'Brand', value: selectedEmulsion.value.brand },
    { label: 'ISO', value: String(selectedEmulsion.value.isoSpeed) },
    { label: 'Balance', value: selectedEmulsion.value.balance },
    {
      label: 'Compatible formats',
      value: selectedEmulsion.value.filmFormats.map((format) => format.code).join(', ') || '-'
    },
    { label: 'Emulsion ID', value: String(selectedEmulsion.value.id) }
  ];
});

function goBack(): void {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push('/emulsions');
}

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }

    await referenceStore.loadEmulsion(emulsionId.value);
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load emulsion detail.'));
  }
});
</script>

<template>
  <PageShell title="Emulsion Detail" subtitle="Read-only reference detail for this stock.">
    <template #actions>
      <NButton tertiary @click="goBack">Back</NButton>
    </template>

    <NAlert v-if="referenceStore.emulsionDetailError" type="error" :show-icon="true">
      {{ referenceStore.emulsionDetailError }}
    </NAlert>

    <EntityDetailHeaderCard
      v-if="selectedEmulsion"
      :title="`${selectedEmulsion.manufacturer} ${selectedEmulsion.brand}`"
      :subtitle="`ISO ${selectedEmulsion.isoSpeed}`"
      :tag-label="selectedEmulsion.developmentProcess.label"
      tag-type="info"
      :details="detailItems"
    />

    <NEmpty
      v-if="!referenceStore.isLoadingEmulsionDetail && !selectedEmulsion"
      description="Emulsion not found."
    />
  </PageShell>
</template>
