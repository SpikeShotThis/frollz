<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useFilmSuppliersStore } from '../../stores/film-suppliers.js';
import { useUiFeedback } from '../../composables/useUiFeedback.js';
import { createIdempotencyKey } from '../../composables/idempotency.js';

const filmSuppliersStore = useFilmSuppliersStore();
const feedback = useUiFeedback();
const includeInactive = ref(false);
const query = ref('');
const isSupplierDialogOpen = ref(false);
const form = reactive({
  id: null as number | null,
  name: '',
  contact: '',
  email: '',
  website: '',
  notes: '',
  rating: null as number | null
});
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const createIdempotency = ref(createIdempotencyKey());
const ratingModel = computed({
  get: () => form.rating ?? 0,
  set: (value: number) => {
    form.rating = value > 0 ? value : null;
  }
});

async function loadSuppliers(): Promise<void> {
  try {
    await filmSuppliersStore.loadFilmSuppliers({ q: query.value, includeInactive: includeInactive.value });
    loadError.value = null;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load suppliers';
  }
}

function beginCreate(): void {
  form.id = null;
  form.name = '';
  form.contact = '';
  form.email = '';
  form.website = '';
  form.notes = '';
  form.rating = null;
  createIdempotency.value = createIdempotencyKey();
  isSupplierDialogOpen.value = true;
}

function beginEdit(id: number): void {
  const supplier = filmSuppliersStore.filmSuppliers.find((item) => item.id === id);
  if (!supplier) return;
  form.id = supplier.id;
  form.name = supplier.name;
  form.contact = supplier.contact ?? '';
  form.email = supplier.email ?? '';
  form.website = supplier.website ?? '';
  form.notes = supplier.notes ?? '';
  form.rating = supplier.rating;
  isSupplierDialogOpen.value = true;
}

async function save(): Promise<void> {
  if (!form.name.trim() || isSaving.value) return;
  isSaving.value = true;
  try {
    const editingId = form.id;
    const isEditing = editingId !== null;
    const payload = {
      name: form.name.trim(),
      contact: form.contact || undefined,
      email: form.email || undefined,
      website: form.website || undefined,
      notes: form.notes || undefined,
      rating: form.rating ?? undefined
    };
    if (isEditing) {
      await filmSuppliersStore.updateFilmSupplier(editingId, payload);
    } else {
      await filmSuppliersStore.createFilmSupplier(payload, createIdempotency.value);
    }
    isSupplierDialogOpen.value = false;
    form.id = null;
    feedback.success(isEditing ? 'Supplier updated.' : 'Supplier created.');
    await loadSuppliers();
  } catch (error) {
    feedback.error(feedback.toErrorMessage(error, 'Failed to save supplier.'));
  } finally {
    isSaving.value = false;
  }
}

async function archive(id: number): Promise<void> {
  await filmSuppliersStore.updateFilmSupplier(id, { active: false });
  await loadSuppliers();
}

async function restore(id: number): Promise<void> {
  await filmSuppliersStore.updateFilmSupplier(id, { active: true });
  await loadSuppliers();
}

onMounted(async () => {
  await loadSuppliers();
});
</script>

<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div class="row items-center justify-between q-gutter-sm">
      <div class="text-h5">Film Suppliers</div>
      <q-btn color="primary" label="Add supplier" @click="beginCreate" />
    </div>
    <div class="row q-gutter-sm items-center">
      <q-input v-model="query" filled label="Search suppliers" class="col" @update:model-value="loadSuppliers" />
      <q-toggle v-model="includeInactive" label="Show inactive" @update:model-value="loadSuppliers" />
    </div>
    <q-banner v-if="loadError" class="bg-red-1 text-negative" rounded>
      {{ loadError }}
    </q-banner>

    <q-table
      :rows="filmSuppliersStore.filmSuppliers"
      :columns="[
        { name: 'name', label: 'Name', field: 'name', align: 'left' },
        { name: 'rating', label: 'Rating', field: 'rating', align: 'left' },
        { name: 'active', label: 'Active', field: 'active', align: 'left' },
        { name: 'actions', label: 'Actions', field: 'id', align: 'left' }
      ]"
      row-key="id"
      flat
      bordered
      :loading="filmSuppliersStore.isLoading"
    >
      <template #body-cell-rating="props">
        <q-td :props="props">
          <q-rating :model-value="props.row.rating || 0" :max="5" size="18px" color="amber" readonly />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="row q-gutter-xs">
          <q-btn flat dense color="primary" label="Edit" @click="beginEdit(props.row.id)" />
          <q-btn v-if="props.row.active" flat dense color="negative" label="Archive" @click="archive(props.row.id)" />
          <q-btn v-else flat dense color="positive" label="Restore" @click="restore(props.row.id)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="isSupplierDialogOpen">
      <q-card class="full-width">
        <q-card-section>
          <div class="text-h6">{{ form.id ? 'Edit Supplier' : 'Create Supplier' }}</div>
        </q-card-section>
        <q-card-section class="column q-gutter-sm">
          <q-input v-model="form.name" filled label="Name" />
          <q-input v-model="form.contact" filled label="Contact" />
          <q-input v-model="form.email" filled label="Email" />
          <q-input v-model="form.website" filled label="Website" />
          <q-input v-model="form.notes" filled type="textarea" label="Notes" />
          <q-rating v-model="ratingModel" :max="5" size="24px" color="amber" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn color="primary" :label="form.id ? 'Save' : 'Create'" :loading="isSaving" :disable="isSaving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
