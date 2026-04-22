<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { NAlert, NCard, NInput, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import type { FilmDevice } from '@frollz2/schema';
import { useReferenceStore } from '../stores/reference.js';
import { useDeviceStore } from '../stores/devices.js';
import PageShell from '../components/PageShell.vue';
import InventorySplitLayout from '../components/inventory/InventorySplitLayout.vue';
import EntityTablePanel from '../components/inventory/EntityTablePanel.vue';
import KpiCardGrid from '../components/inventory/KpiCardGrid.vue';
import { usePagedEntityTable } from '../composables/usePagedEntityTable.js';
import { useUiFeedback } from '../composables/useUiFeedback.js';
import {
  buildDeviceKpis,
  devicePrimaryLabel,
  filterAndSortDevicesForChildTable,
  filterDevicesByTypeCode
} from './device-dashboard.js';

const referenceStore = useReferenceStore();
const deviceStore = useDeviceStore();
const route = useRoute();
const feedback = useUiFeedback();

const searchTerm = ref('');

const deviceTypeTagTypeByCode: Record<string, 'default' | 'info' | 'primary'> = {
  camera: 'primary',
  interchangeable_back: 'info',
  film_holder: 'default'
};

const lockedDeviceType = computed(() =>
  typeof route.meta.deviceTypeFilter === 'string' ? route.meta.deviceTypeFilter : null
);

const pageSubtitle = computed(() =>
  lockedDeviceType.value
    ? 'Category-focused inventory list with searchable table and device KPIs.'
    : 'Device inventory with searchable table and KPI snapshot.'
);

const visibleDevices = computed(() => filterDevicesByTypeCode(deviceStore.devices, lockedDeviceType.value));

const filteredDevices = computed(() => filterAndSortDevicesForChildTable(visibleDevices.value, searchTerm.value));

const tableState = usePagedEntityTable({
  rows: filteredDevices,
  resetPageOn: [searchTerm, () => route.path],
  initialPageSize: 10
});

const kpiCards = computed(() => buildDeviceKpis(visibleDevices.value));

const columns = computed<DataTableColumns<FilmDevice>>(() => [
  {
    title: 'Device',
    key: 'name',
    render: (row) => h(
      RouterLink,
      {
        to: `/devices/${row.id}`,
        class: 'device-table__link',
        style: {
          color: 'var(--n-primary-color)',
          fontWeight: 600,
          textDecorationColor: 'var(--n-primary-color)'
        }
      },
      { default: () => devicePrimaryLabel(row) }
    )
  },
  {
    title: 'Type',
    key: 'deviceTypeCode',
    render: (row) => h(
      NTag,
      { size: 'small', type: deviceTypeTagTypeByCode[row.deviceTypeCode] ?? 'default' },
      { default: () => row.deviceTypeCode.replace('_', ' ') }
    )
  },
  {
    title: 'Format',
    key: 'filmFormatId',
    render: (row) => {
      const formatCode = referenceStore.filmFormats.find((format) => format.id === row.filmFormatId)?.code;
      return `${formatCode ?? row.filmFormatId} · ${row.frameSize}`;
    }
  }
]);

async function refresh(): Promise<void> {
  try {
    await deviceStore.loadDevices();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load devices.'));
  }
}

onMounted(async () => {
  try {
    if (!referenceStore.loaded) {
      await referenceStore.loadAll();
    }

    await refresh();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Could not load device page.'));
  }
});
</script>

<template>
  <PageShell title="Devices" :subtitle="pageSubtitle">
    <NAlert v-if="deviceStore.listError" type="error" :show-icon="true">
      {{ deviceStore.listError }}
    </NAlert>

    <InventorySplitLayout left-panel-title="Devices in this category" right-panel-title="Category KPIs">
      <template #left>
        <NCard>
          <EntityTablePanel
            :columns="columns"
            :data="tableState.pagedRows.value"
            :loading="deviceStore.isLoading"
            :row-key="(row) => row.id"
            :page="tableState.page.value"
            :page-size="tableState.pageSize.value"
            :item-count="tableState.totalRows.value"
            :page-sizes="tableState.pageSizes"
            empty-description="No devices match the current filters."
            table-test-id="devices-child-table"
            pagination-test-id="devices-child-pagination"
            @update:page="(value) => { tableState.page.value = value; }"
            @update:page-size="(value) => { tableState.pageSize.value = value; }"
          >
            <template #filters>
              <NInput
                v-model:value="searchTerm"
                clearable
                placeholder="Search make, model, system, holder"
                data-testid="devices-child-search"
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
.device-table__link {
  color: var(--n-primary-color);
  text-decoration: none;
}

.device-table__link:hover {
  text-decoration: underline;
}

.device-table__link:visited {
  color: var(--n-primary-color);
}

.device-table__link:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--n-primary-color);
  outline-offset: 2px;
}
</style>
