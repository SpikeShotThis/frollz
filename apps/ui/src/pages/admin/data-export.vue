<script setup lang="ts">
import { useAdminStore } from '../../stores/admin.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';

const adminStore = useAdminStore();
const feedback = useUiFeedback();

async function handleExport() {
  try {
    await adminStore.exportData();
    feedback.success('Data exported successfully');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to export data'));
  }
}

async function handleImport() {
  try {
    if (!adminStore.importDataFile) {
      feedback.error('Please select a file to import');
      return;
    }
    await adminStore.importData(adminStore.importDataFile);
    adminStore.importDataFile = null;
    feedback.success('Data imported successfully');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to import data'));
  }
}
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div>
      <div class="text-h5">Data Export & Import</div>
      <div class="text-subtitle2 text-grey-7">
        Backup and restore your film tracking data
      </div>
    </div>

    <q-banner v-if="adminStore.exportError" class="bg-red-1 text-negative" rounded>
      <template #avatar>
        <q-icon name="error" color="negative" />
      </template>
      {{ adminStore.exportError }}
    </q-banner>

    <q-banner v-if="adminStore.importError" class="bg-red-1 text-negative" rounded>
      <template #avatar>
        <q-icon name="error" color="negative" />
      </template>
      {{ adminStore.importError }}
    </q-banner>

    <div class="row q-col-gutter-md">
      <!-- Export Card -->
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-gutter-sm">
              <q-icon name="cloud_download" color="primary" size="32px" />
              <div class="text-h6">Export Data</div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <p class="text-body2 q-mb-md">
              Download a complete backup of your film tracking data including:
            </p>
            <ul class="text-body2 q-pl-md">
              <li>All devices (cameras, backs, holders)</li>
              <li>Film lots and individual films</li>
              <li>Film and frame journey events</li>
              <li>Device mount history</li>
            </ul>
            <p class="text-body2 text-grey-7 q-mt-md">
              The export file is in JSON format and can be imported later to restore your data.
            </p>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
            <q-btn color="primary" label="Export Data" icon="cloud_download" :loading="adminStore.isExporting"
              @click="handleExport" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Import Card -->
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-gutter-sm">
              <q-icon name="cloud_upload" color="secondary" size="32px" />
              <div class="text-h6">Import Data</div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <p class="text-body2 q-mb-md">
              Restore your film tracking data from a previously exported JSON file.
            </p>
            <q-file v-model="adminStore.importDataFile" label="Chose a file to upload" accept=".json"
              @rejected="adminStore.importError" />
          </q-card-section>

          <q-separator />

          <q-card-actions align="right">
            <q-btn color="secondary" label="Import Data" icon="cloud_upload" :loading="adminStore.isImporting"
              :disable="!adminStore.importDataFile || adminStore.isImporting" @click="handleImport" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
