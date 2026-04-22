<script setup lang="ts" generic="TRow extends Record<string, unknown>">
import { computed } from 'vue';
import { NDataTable, NEmpty, NFlex, NPagination } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';

type RowKey = string | number;

const props = withDefaults(defineProps<{
  columns: DataTableColumns<TRow>;
  data: TRow[];
  loading?: boolean;
  rowKey: (row: TRow) => RowKey;
  page: number;
  pageSize: number;
  itemCount: number;
  pageSizes?: number[];
  showSizePicker?: boolean;
  emptyDescription?: string;
  tableTestId?: string;
  paginationTestId?: string;
}>(), {
  loading: false,
  pageSizes: () => [10, 25, 50],
  showSizePicker: true,
  emptyDescription: 'No matching records found.',
  tableTestId: '',
  paginationTestId: ''
});

const emit = defineEmits<{
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const hasRows = computed(() => props.data.length > 0);
</script>

<template>
  <NFlex vertical size="small">
    <NFlex v-if="$slots.filters" :wrap="false" size="small" class="entity-table-panel__filters" align="center">
      <slot name="filters" />
    </NFlex>

    <NEmpty
      v-if="!loading && !hasRows"
      :description="emptyDescription"
    />
    <template v-else>
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :bordered="false"
        :single-line="false"
        :row-key="rowKey"
        :data-testid="tableTestId"
      />
      <NFlex justify="end">
        <NPagination
          :page="page"
          :page-size="pageSize"
          :item-count="itemCount"
          :page-sizes="pageSizes"
          :show-size-picker="showSizePicker"
          :data-testid="paginationTestId"
          @update:page="(value) => emit('update:page', value)"
          @update:page-size="(value) => emit('update:pageSize', value)"
        />
      </NFlex>
    </template>
  </NFlex>
</template>

<style scoped>
.entity-table-panel__filters {
  width: 100%;
}

@media (max-width: 680px) {
  .entity-table-panel__filters {
    flex-wrap: wrap;
  }
}
</style>
