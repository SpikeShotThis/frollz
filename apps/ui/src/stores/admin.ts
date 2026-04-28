import { defineStore } from 'pinia';
import { ref } from 'vue';
import { exportDataSchema, type ExportData } from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useAdminStore = defineStore('admin', () => {
  const { request } = useApi();
  const isExporting = ref(false);
  const isImporting = ref(false);
  const importDataFile = ref<File | null>(null);
  const exportError = ref<string | null>(null);
  const importError = ref<string | null>(null);

  async function exportData(): Promise<void> {
    isExporting.value = true;
    exportError.value = null;

    try {
      const response = await request('/api/v1/admin/export');
      const exportData: ExportData = exportDataSchema.parse(await readApiData(response));

      // Create JSON blob and trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Format filename with current date
      const date = new Date().toISOString().split('T')[0];
      link.download = `frollz-export-${date}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      exportError.value = error instanceof Error ? error.message : 'Failed to export data';
      throw error;
    } finally {
      isExporting.value = false;
    }
  }

  async function importData(file: File): Promise<void> {
    isImporting.value = true;
    importError.value = null;
    try {
      const response = await request('/api/v1/admin/import', {
        method: 'POST',
        body: file
      });

      if (!response.ok) {
        throw new Error(await readApiData(response));
      }
    } catch (error) {
      importError.value = error instanceof Error ? error.message : 'Failed to import data';
      throw error;
    } finally {
      isImporting.value = false;
    }
  }

  return {
    isExporting,
    isImporting,
    exportError,
    importError,
    exportData,
    importData,
    importDataFile
  };
});
