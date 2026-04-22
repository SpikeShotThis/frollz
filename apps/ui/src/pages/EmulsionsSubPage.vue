<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { NAlert, NCard, NInput, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { Emulsion } from '@frollz2/schema';
import { useReferenceStore } from '../stores/reference.js';
import PageShell from '../components/PageShell.vue';
import InventorySplitLayout from '../components/inventory/InventorySplitLayout.vue';
import EntityTablePanel from '../components/inventory/EntityTablePanel.vue';
import KpiCardGrid from '../components/inventory/KpiCardGrid.vue';
import { usePagedEntityTable } from '../composables/usePagedEntityTable.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import {
  buildEmulsionKpis,
  filterAndSortEmulsionsForChildTable,
  filterEmulsionsByProcessCode
} from './emulsion-dashboard.js';

const referenceStore = useReferenceStore();
const route = useRoute();
const feedback = useUiFeedback();

const searchTerm = ref('');

const lockedDevelopmentProcess = computed(() =>
  typeof route.meta.developmentProcessFilter === 'string' ? route.meta.developmentProcessFilter : null
);

const pageSubtitle = computed(() =>
  lockedDevelopmentProcess.value
    ? 'Process-focused emulsion list with searchable table and KPIs.'
    : 'Emulsion inventory with searchable table and KPI snapshot.'
);

const visibleEmulsions = computed(() =>
  filterEmulsionsByProcessCode(referenceStore.emulsions, lockedDevelopmentProcess.value)
);

const filteredEmulsions = computed(() =>
  filterAndSortEmulsionsForChildTable(visibleEmulsions.value, searchTerm.value)
);

const tableState = usePagedEntityTable({
  rows: filteredEmulsions,
  resetPageOn: [searchTerm, () => route.path],
  initialPageSize: 10
});

const kpiCards = computed(() => buildEmulsionKpis(visibleEmulsions.value));

const columns = computed<DataTableColumns<Emulsion>>(() => [
  {
    title: 'Emulsion',
    key: 'brand',
    render: (row) => h(
      RouterLink,
      {
        to: `/emulsions/${row.id}`,
        class: 'emulsion-table__link',
        style: {
          color: 'var(--n-primary-color)',
          fontWeight: 600,
          textDecorationColor: 'var(--n-primary-color)'
        }
      },
      { default: () => `${row.manufacturer} ${row.brand}` }
    )
  },
  {
    title: 'Process',
    key: 'developmentProcess',
    render: (row) => h(NTag, { size: 'small', type: 'info' }, { default: () => row.developmentProcess.label })
  },
  {
    title: 'ISO',
    key: 'isoSpeed',
    render: (row) => `ISO ${row.isoSpeed}`
  },
  {
    title: 'Formats',
    key: 'formats',
    render: (row) => row.filmFormats.map((format) => format.code).join(', ') || '-'
  }
]);

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

    <InventorySplitLayout left-panel-title="Emulsions in this process" right-panel-title="Process KPIs">
      <template #left>
        <NCard>
          <EntityTablePanel
            :columns="columns"
            :data="tableState.pagedRows.value"
            :loading="referenceStore.isLoading"
            :row-key="(row) => row.id"
            :page="tableState.page.value"
            :page-size="tableState.pageSize.value"
            :item-count="tableState.totalRows.value"
            :page-sizes="tableState.pageSizes"
            empty-description="No emulsions match the current filters."
            table-test-id="emulsions-child-table"
            pagination-test-id="emulsions-child-pagination"
            @update:page="(value) => { tableState.page.value = value; }"
            @update:page-size="(value) => { tableState.pageSize.value = value; }"
          >
            <template #filters>
              <NInput
                v-model:value="searchTerm"
                clearable
                placeholder="Search emulsion, process, ISO, or format"
                data-testid="emulsions-child-search"
              />
            </template>
          </EntityTablePanel>
        </NCard>
      </template>

      <template #right>
        <KpiCardGrid :cards="kpiCards" />
      </template>
    </InventorySplitLayout>
  </PageShell>
</template>

<style scoped>
.emulsion-table__link {
  color: var(--n-primary-color);
  text-decoration: none;
}

.emulsion-table__link:hover {
  text-decoration: underline;
}

.emulsion-table__link:visited {
  color: var(--n-primary-color);
}

.emulsion-table__link:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--n-primary-color);
  outline-offset: 2px;
}
</style>
