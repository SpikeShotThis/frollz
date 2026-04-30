<script setup lang="ts">
import { computed, useSlots } from 'vue';
import type { Emulsion } from '@frollz2/schema';

interface Props {
  rows: Emulsion[];
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false
});

const slots = useSlots();

type Column = { name: string; label: string; field: string | ((row: Emulsion) => unknown); sortable?: boolean; align: 'left' | 'right' };

const columns = computed((): Column[] => {
  const base: Column[] = [
    { name: 'name', label: 'Emulsion', field: (row: Emulsion) => `${row.manufacturer} ${row.brand}`, sortable: true, align: 'left' },
    { name: 'iso', label: 'ISO', field: 'isoSpeed', sortable: true, align: 'left' },
    { name: 'process', label: 'Process', field: (row: Emulsion) => row.developmentProcess.label, sortable: true, align: 'left' },
    { name: 'formats', label: 'Formats', field: (row: Emulsion) => row.filmFormats.map((f) => f.label).join(', '), align: 'left' }
  ];

  if (slots.actions) {
    base.push({ name: 'actions', label: 'Actions', field: 'id', sortable: false, align: 'right' });
  }

  return base;
});
</script>

<template>
  <q-table :rows="rows" :columns="columns" row-key="id" flat bordered :loading="isLoading">
    <template #body-cell-name="props">
      <q-td :props="props">
        <RouterLink :to="`/emulsions/${props.row.id}`" class="text-primary text-weight-medium">
          {{ props.row.manufacturer }} {{ props.row.brand }}
        </RouterLink>
      </q-td>
    </template>
    <template v-if="slots.actions" #body-cell-actions="props">
      <q-td :props="props" class="text-right">
        <slot name="actions" :row="props.row" />
      </q-td>
    </template>
  </q-table>
</template>
