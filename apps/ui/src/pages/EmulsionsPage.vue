<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { NAlert, NCard, NEmpty, NFlex, NTag, NText } from 'naive-ui';
import { useReferenceStore } from '../stores/reference.js';
import PageShell from '../components/PageShell.vue';
import MiniDashboardLayout from '../components/MiniDashboardLayout.vue';
import { useUiFeedback } from '../composables/useUiFeedback.js';

const referenceStore = useReferenceStore();
const feedback = useUiFeedback();
const route = useRoute();

const lockedDevelopmentProcess = computed(() =>
  typeof route.meta.developmentProcessFilter === 'string' ? route.meta.developmentProcessFilter : null
);

const pageSubtitle = computed(() =>
  lockedDevelopmentProcess.value
    ? 'Reference dashboard filtered by development process.'
    : 'Reference dashboard for available film stocks and processing methods.'
);

const visibleEmulsions = computed(() =>
  lockedDevelopmentProcess.value
    ? referenceStore.emulsions.filter((emulsion) => emulsion.developmentProcess.code === lockedDevelopmentProcess.value)
    : referenceStore.emulsions
);

const recentEmulsions = computed(() => visibleEmulsions.value.slice(-10));

const stats = computed(() => {
  const total = visibleEmulsions.value.length;
  const uniqueManufacturers = new Set(visibleEmulsions.value.map((emulsion) => emulsion.manufacturer)).size;
  const uniqueProcesses = new Set(visibleEmulsions.value.map((emulsion) => emulsion.developmentProcess.code)).size;
  const averageIso =
    total === 0 ? 0 : Math.round(visibleEmulsions.value.reduce((sum, emulsion) => sum + emulsion.isoSpeed, 0) / total);

  return [
    { label: 'Total visible emulsions', value: total, helper: 'Current route scope' },
    { label: 'Unique manufacturers', value: uniqueManufacturers, helper: 'Distinct brands in view' },
    { label: 'Unique development processes', value: uniqueProcesses, helper: 'C-41, B&W, E-6, and more' },
    { label: 'Average ISO', value: averageIso, helper: 'Rounded to nearest whole ISO' }
  ];
});

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load emulsion references.'));
  }
});
</script>

<template>
  <PageShell title="Emulsions" :subtitle="pageSubtitle">
    <NAlert v-if="referenceStore.loadError" type="error" :show-icon="true">
      {{ referenceStore.loadError }}
    </NAlert>

    <MiniDashboardLayout left-panel-title="Recently added emulsions" right-panel-title="Emulsion statistics">
      <template #left>
        <NCard :loading="referenceStore.isLoading">
          <NEmpty
            v-if="!referenceStore.isLoading && recentEmulsions.length === 0"
            description="No emulsions are available."
          />
          <NFlex v-else vertical size="small">
            <NCard v-for="emulsion in recentEmulsions" :key="emulsion.id" size="small" embedded>
              <NFlex justify="space-between" align="center" :wrap="false">
                <NText strong>{{ emulsion.manufacturer }} {{ emulsion.brand }}</NText>
                <NTag size="small" type="primary">ISO {{ emulsion.isoSpeed }}</NTag>
              </NFlex>
              <NText depth="3">{{ emulsion.developmentProcess.label }} · {{ emulsion.balance }}</NText>
              <NText depth="3">
                Formats: {{ emulsion.filmFormats.map((format) => format.code).join(', ') || 'None' }}
              </NText>
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
</template>
