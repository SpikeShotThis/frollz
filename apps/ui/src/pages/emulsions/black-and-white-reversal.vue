<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Emulsion } from '@frollz2/schema';
import { useReferenceStore } from '../../stores/reference.js';

const route = useRoute();
const referenceStore = useReferenceStore();
const search = ref<string | null>('');

const processFilterCode = computed(() => {
  const value = route.meta.developmentProcessFilter;
  return typeof value === 'string' ? value : null;
});

const rows = computed(() => {
  const query = (search.value ?? '').trim().toLowerCase();

  return referenceStore.emulsions.filter((emulsion) => {
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

const columns = [
  {
    name: 'name',
    label: 'Emulsion',
    field: (row: Emulsion) => `${row.manufacturer} ${row.brand}`,
    sortable: true,
    align: 'left'
  },
  {
    name: 'iso',
    label: 'ISO',
    field: 'isoSpeed',
    sortable: true,
    align: 'left'
  },
  {
    name: 'process',
    label: 'Process',
    field: (row: Emulsion) => row.developmentProcess.label,
    sortable: true,
    align: 'left'
  },
  {
    name: 'formats',
    label: 'Formats',
    field: (row: Emulsion) => row.filmFormats.map((format) => format.label).join(', '),
    align: 'left'
  }
];

onMounted(async () => {
  await referenceStore.loadAll();
});
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div>
        <div class="text-h5">Emulsions</div>
        <div class="text-subtitle2 text-grey-7">Reference library filtered by process and search.</div>
      </div>
      <q-btn color="primary" label="Refresh" @click="referenceStore.loadAll" />
    </div>

    <q-input v-model="search" filled label="Search emulsions" clearable />

    <q-table :rows="rows" :columns="columns" row-key="id" flat bordered :loading="referenceStore.isLoading">
      <template #body-cell-name="props">
        <q-td :props="props">
          <RouterLink :to="`/emulsions/${props.row.id}`" class="text-primary text-weight-medium">
            {{ props.row.manufacturer }} {{ props.row.brand }}
          </RouterLink>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>
