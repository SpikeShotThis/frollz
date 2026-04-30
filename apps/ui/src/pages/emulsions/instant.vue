<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Emulsion } from '@frollz2/schema';
import EmulsionTable from '../../components/EmulsionTable.vue';
import { useEmulsionStore } from '../../stores/emulsions.js';

const route = useRoute();
const emulsionStore = useEmulsionStore();
const search = ref<string | null>('');

const processFilterCode = computed(() => {
  const value = route.meta.developmentProcessFilter;
  return typeof value === 'string' ? value : null;
});

const rows = computed(() => {
  const query = (search.value ?? '').trim().toLowerCase();

  return emulsionStore.emulsions.filter((emulsion) => {
    if (processFilterCode.value && emulsion.developmentProcess.code !== processFilterCode.value) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = `${emulsion.manufacturer} ${emulsion.brand} ${emulsion.developmentProcess.label} ${emulsion.isoSpeed}`.toLowerCase();
    return haystack.includes(query);
  });
});

onMounted(async () => {
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
      <q-btn color="primary" label="Refresh" @click="emulsionStore.loadAll" />
    </div>

    <q-input v-model="search" filled label="Search emulsions" clearable />

    <EmulsionTable :rows="rows" :is-loading="emulsionStore.isLoading" />
  </q-page>
</template>
