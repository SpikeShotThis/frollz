<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Emulsion } from '@frollz2/schema';
import CreateEmulsionDialog from '../../components/CreateEmulsionDialog.vue';
import EditEmulsionDialog from '../../components/EditEmulsionDialog.vue';
import EmulsionTable from '../../components/EmulsionTable.vue';
import { useUiFeedback } from '../../composables/useUiFeedback.js';
import { useEmulsionStore } from '../../stores/emulsions.js';

const route = useRoute();
const emulsionStore = useEmulsionStore();
const feedback = useUiFeedback();
const search = ref<string | null>('');
const isCreateDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const editingEmulsion = ref<Emulsion | null>(null);
const deletingEmulsion = ref<Emulsion | null>(null);
const isDeleting = ref(false);

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

function openEditDialog(emulsion: Emulsion): void {
  editingEmulsion.value = emulsion;
  isEditDialogOpen.value = true;
}

function openDeleteDialog(emulsion: Emulsion): void {
  deletingEmulsion.value = emulsion;
}

async function confirmDelete(): Promise<void> {
  if (!deletingEmulsion.value || isDeleting.value) return;
  isDeleting.value = true;
  try {
    await emulsionStore.deleteEmulsion(deletingEmulsion.value.id);
    feedback.success('Emulsion deleted.');
    deletingEmulsion.value = null;
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to delete emulsion.'));
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div>
        <div class="text-h5">Emulsions</div>
        <div class="text-subtitle2 text-grey-7">Shared catalog filtered by process and search.</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn color="primary" label="Add emulsion" @click="isCreateDialogOpen = true" />
      </div>
    </div>

    <q-input v-model="search" filled label="Search emulsions" clearable />

    <EmulsionTable :rows="rows" :is-loading="emulsionStore.isLoading">
      <template #actions="{ row }">
        <q-btn flat dense color="primary" label="Edit" data-testid="emulsion-row-edit" @click="openEditDialog(row)" />
        <q-btn flat dense color="negative" label="Delete" data-testid="emulsion-row-delete" @click="openDeleteDialog(row)" />
      </template>
    </EmulsionTable>

    <CreateEmulsionDialog v-model="isCreateDialogOpen" @created="emulsionStore.loadAll(true)" />
    <EditEmulsionDialog v-model="isEditDialogOpen" :emulsion="editingEmulsion" @updated="emulsionStore.loadAll(true)" />

    <q-dialog :model-value="deletingEmulsion !== null" @update:model-value="deletingEmulsion = null">
      <q-card>
        <q-card-section class="text-h6">Delete emulsion</q-card-section>
        <q-card-section>
          Are you sure you want to delete
          <strong v-if="deletingEmulsion">{{ deletingEmulsion.manufacturer }} {{ deletingEmulsion.brand }}</strong>?
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="deletingEmulsion = null" />
          <q-btn color="negative" label="Delete" data-testid="emulsion-delete-confirm" :loading="isDeleting" :disable="isDeleting" @click="confirmDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
