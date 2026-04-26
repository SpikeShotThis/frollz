<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useReferenceStore } from '../../stores/reference.js';

const route = useRoute();
const referenceStore = useReferenceStore();

const emulsionId = computed(() => Number(route.params.id));

async function load(): Promise<void> {
  if (!Number.isFinite(emulsionId.value)) {
    return;
  }

  await Promise.all([referenceStore.loadAll(), referenceStore.loadEmulsion(emulsionId.value)]);
}

onMounted(load);
watch(emulsionId, load);
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <q-btn flat color="primary" icon="arrow_back" label="Back to emulsions" to="/emulsions" class="self-start" />

    <q-banner v-if="referenceStore.emulsionDetailError" class="bg-red-1 text-negative" rounded>
      {{ referenceStore.emulsionDetailError }}
    </q-banner>

    <q-card v-if="referenceStore.currentEmulsion" flat bordered>
      <q-card-section>
        <div class="text-h5">{{ referenceStore.currentEmulsion.manufacturer }} {{ referenceStore.currentEmulsion.brand }}</div>
        <div class="text-subtitle2 text-grey-7">ISO {{ referenceStore.currentEmulsion.isoSpeed }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="column q-gutter-sm" data-testid="emulsion-detail-meta">
        <div data-testid="emulsion-detail-process">
          <span class="text-grey-7">Process:</span>
          <span data-testid="emulsion-detail-process-value">{{ referenceStore.currentEmulsion.developmentProcess.label }}</span>
        </div>
        <div data-testid="emulsion-detail-balance">
          <span class="text-grey-7">Balance:</span>
          <span data-testid="emulsion-detail-balance-value">{{ referenceStore.currentEmulsion.balance }}</span>
        </div>
        <div data-testid="emulsion-detail-formats">
          <span class="text-grey-7">Formats:</span>
          <span data-testid="emulsion-detail-formats-value">{{ referenceStore.currentEmulsion.filmFormats.map((format) => format.label).join(', ') }}</span>
        </div>
      </q-card-section>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="text-grey-7">Select an emulsion from the list.</q-card-section>
    </q-card>
  </q-page>
</template>
