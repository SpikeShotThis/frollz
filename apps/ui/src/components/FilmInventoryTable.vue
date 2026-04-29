<script setup lang="ts">
import type { FilmSummary } from '@frollz2/schema';

interface Props {
  rows: FilmSummary[];
  isLoading?: boolean;
  extractName: (row: FilmSummary) => string;
  extractState: (row: FilmSummary) => string;
  extractEmulsion: (row: FilmSummary) => string;
  extractFormat: (row: FilmSummary) => string;
  extractIso: (row: FilmSummary) => string;
}

withDefaults(defineProps<Props>(), {
  isLoading: false
});

const columns = [
  {
    name: 'name',
    label: 'Film',
    field: 'name',
    sortable: true,
    align: 'left' as const
  },
  {
    name: 'state',
    label: 'State',
    field: 'state',
    sortable: true,
    align: 'left' as const
  },
  {
    name: 'emulsion',
    label: 'Emulsion',
    field: 'emulsion',
    sortable: true,
    align: 'left' as const
  },
  {
    name: 'format',
    label: 'Format',
    field: 'format',
    sortable: true,
    align: 'left' as const
  },
  {
    name: 'iso',
    label: 'ISO',
    field: 'iso',
    sortable: true,
    align: 'left' as const
  }
];
</script>

<template>
  <q-table :rows="rows" :columns="columns" row-key="id" flat bordered :loading="isLoading">
    <template #body-cell-name="props">
      <q-td :props="props">
        <RouterLink :to="`/film/${props.row.id}`" class="text-primary text-weight-medium">
          {{ extractName(props.row) }}
        </RouterLink>
      </q-td>
    </template>
    <template #body-cell-state="props">
      <q-td :props="props">
        <q-badge color="primary" outline>{{ extractState(props.row) }}</q-badge>
      </q-td>
    </template>
    <template #body-cell-emulsion="props">
      <q-td :props="props">
        {{ extractEmulsion(props.row) }}
      </q-td>
    </template>
    <template #body-cell-format="props">
      <q-td :props="props">
        {{ extractFormat(props.row) }}
      </q-td>
    </template>
    <template #body-cell-iso="props">
      <q-td :props="props">
        {{ extractIso(props.row) }}
      </q-td>
    </template>
  </q-table>
</template>
