<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useFilmLabsStore } from '../../stores/film-labs.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';
import { useCrudDialog } from '../../composables/useCrudDialog.js';

const filmLabsStore = useFilmLabsStore();
const feedback = useUiFeedback();
const {
  isDialogOpen: isLabDialogOpen,
  isSaving,
  archiveTarget,
  openForCreate,
  openForEdit,
  closeDialog,
  beginArchive,
  cancelArchive,
} = useCrudDialog();
const includeInactive = ref(false);
const query = ref('');
const form = reactive({
  id: null as number | null,
  name: '',
  contact: '',
  email: '',
  website: '',
  defaultProcesses: '',
  notes: '',
  rating: null as number | null
});
const ratingModel = computed({
  get: () => form.rating ?? 0,
  set: (value: number) => {
    form.rating = value > 0 ? value : null;
  }
});

async function loadLabs(): Promise<void> {
  await filmLabsStore.loadFilmLabs({ q: query.value, includeInactive: includeInactive.value });
}

function beginCreate(): void {
  openForCreate(() => {
    form.id = null;
    form.name = '';
    form.contact = '';
    form.email = '';
    form.website = '';
    form.defaultProcesses = '';
    form.notes = '';
    form.rating = null;
  });
}

function beginEdit(id: number): void {
  const lab = filmLabsStore.filmLabs.find((item) => item.id === id);
  if (!lab) return;
  openForEdit(() => {
    form.id = lab.id;
    form.name = lab.name;
    form.contact = lab.contact ?? '';
    form.email = lab.email ?? '';
    form.website = lab.website ?? '';
    form.defaultProcesses = lab.defaultProcesses ?? '';
    form.notes = lab.notes ?? '';
    form.rating = lab.rating;
  });
}

async function save(): Promise<void> {
  if (!form.name.trim() || isSaving.value) return;
  isSaving.value = true;
  const isEditing = form.id !== null;
  try {
    const payload = {
      name: form.name.trim(),
      contact: form.contact || undefined,
      email: form.email || undefined,
      website: form.website || undefined,
      defaultProcesses: form.defaultProcesses || undefined,
      notes: form.notes || undefined,
      rating: form.rating ?? undefined
    };
    if (form.id) {
      await filmLabsStore.updateFilmLab(form.id, payload);
    } else {
      await filmLabsStore.createFilmLab(payload);
    }
    closeDialog();
    form.id = null;
    feedback.success(isEditing ? 'Lab updated.' : 'Lab created.');
    await loadLabs();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to save lab.'));
  } finally {
    isSaving.value = false;
  }
}

function startArchive(id: number): void {
  const lab = filmLabsStore.filmLabs.find((item) => item.id === id);
  if (!lab) return;
  beginArchive(id, lab.name);
}

async function confirmArchive(): Promise<void> {
  if (!archiveTarget.value) return;
  const { id } = archiveTarget.value;
  cancelArchive();
  try {
    await filmLabsStore.updateFilmLab(id, { active: false });
    await loadLabs();
    feedback.success('Lab archived.');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to archive lab.'));
  }
}

async function restore(id: number): Promise<void> {
  try {
    await filmLabsStore.updateFilmLab(id, { active: true });
    await loadLabs();
    feedback.success('Lab restored.');
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to restore lab.'));
  }
}

onMounted(async () => {
  await loadLabs();
});
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div class="text-h5">Film Labs</div>
      <q-btn color="primary" label="Add lab" @click="beginCreate" />
    </div>
    <div class="row q-col-gutter-md">
      <q-input v-model="query" filled label="Search labs" class="col" @update:model-value="loadLabs" />
      <q-toggle v-model="includeInactive" label="Show inactive" @update:model-value="loadLabs" />
    </div>

    <q-banner v-if="filmLabsStore.listError" class="bg-red-1 text-negative" rounded>
      {{ filmLabsStore.listError }}
    </q-banner>

    <q-table :rows="filmLabsStore.filmLabs" :columns="[
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      { name: 'rating', label: 'Rating', field: 'rating', align: 'left' },
      { name: 'active', label: 'Active', field: 'active', align: 'left' },
      { name: 'actions', label: 'Actions', field: 'id', align: 'left' }
    ]" row-key="id" flat bordered :loading="filmLabsStore.isLoading">
      <template #body-cell-rating="props">
        <q-td :props="props">
          <q-rating v-if="props.row.rating" :model-value="props.row.rating" :max="5" size="18px" color="amber" readonly />
          <span v-else class="text-muted">—</span>
        </q-td>
      </template>
      <template #body-cell-active="props">
        <q-td :props="props">
          <q-badge
            :color="props.row.active ? 'positive' : 'grey-5'"
            :label="props.row.active ? 'Active' : 'Inactive'"
            outline
          />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="row q-gutter-xs">
          <q-btn flat dense color="primary" label="Edit" @click="beginEdit(props.row.id)" />
          <q-btn v-if="props.row.active" flat dense color="negative" label="Archive" @click="startArchive(props.row.id)" />
          <q-btn v-else flat dense color="positive" label="Restore" @click="restore(props.row.id)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="isLabDialogOpen">
      <q-card class="full-width">
        <q-card-section>
          <div class="text-h6">{{ form.id ? 'Edit Lab' : 'Create Lab' }}</div>
        </q-card-section>
        <q-card-section class="column q-gutter-sm">
          <q-input v-model="form.name" filled label="Name" />
          <q-input v-model="form.contact" filled label="Contact" />
          <q-input v-model="form.email" filled label="Email" />
          <q-input v-model="form.website" filled label="Website" />
          <q-input v-model="form.defaultProcesses" filled label="Default processes" hint="e.g. C-41, E-6, B&W" />
          <q-input v-model="form.notes" filled type="textarea" label="Notes" />
          <q-rating v-model="ratingModel" :max="5" size="24px" color="amber" aria-label="Rating (1–5 stars)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn color="primary" :label="form.id ? 'Save' : 'Create'" :loading="isSaving" :disable="isSaving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="archiveTarget !== null" @update:model-value="cancelArchive">
      <q-card>
        <q-card-section class="text-h6">Archive lab</q-card-section>
        <q-card-section>
          Archive <strong>{{ archiveTarget?.name }}</strong>? It will be hidden but can be restored later.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="cancelArchive" />
          <q-btn color="negative" label="Archive" @click="confirmArchive" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
