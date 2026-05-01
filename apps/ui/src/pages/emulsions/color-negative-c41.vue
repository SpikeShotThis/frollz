<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import EmulsionTable from '../../components/EmulsionTable.vue';
import { useEmulsionStore } from '../../stores/emulsions.js';

const route = useRoute();
const emulsionStore = useEmulsionStore();

onMounted(async () => {
  emulsionStore.setProcessFilterFromMeta(route.meta.developmentProcessFilter);
  await emulsionStore.loadAll();
});
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div>
        <div class="text-h5">Emulsions</div>
        <div class="text-subtitle2 text-grey-7">Shared catalog filtered by process and search.</div>
      </div>
    </div>

    <q-input v-model="emulsionStore.emulsionSearch" filled label="Search emulsions" clearable />

    <EmulsionTable :rows="emulsionStore.filteredEmulsions" :is-loading="emulsionStore.isLoading" />
  </q-page>
</template>
