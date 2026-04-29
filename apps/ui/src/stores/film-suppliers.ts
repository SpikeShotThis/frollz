import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createFilmSupplierRequestSchema,
  filmSupplierSchema,
  listFilmSuppliersQuerySchema,
  updateFilmSupplierRequestSchema,
  type CreateFilmSupplierRequest,
  type FilmSupplier,
  type ListFilmSuppliersQuery,
  type UpdateFilmSupplierRequest
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useFilmSuppliersStore = defineStore('film-suppliers', () => {
  const { request } = useApi();
  const filmSuppliers = ref<FilmSupplier[]>([]);
  const isLoading = ref(false);
  const listError = ref<string | null>(null);

  async function loadFilmSuppliers(query: Partial<ListFilmSuppliersQuery> = {}): Promise<void> {
    isLoading.value = true;
    listError.value = null;
    try {
      const parsed = listFilmSuppliersQuerySchema.parse(query);
      const params = new URLSearchParams({
        q: parsed.q,
        includeInactive: String(parsed.includeInactive),
        limit: String(parsed.limit)
      });
      const response = await request(`/api/v1/film-suppliers?${params.toString()}`);
      filmSuppliers.value = filmSupplierSchema.array().parse(await readApiData(response));
    } catch (error) {
      listError.value = error instanceof Error ? error.message : 'Failed to load film suppliers';
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function createFilmSupplier(input: CreateFilmSupplierRequest, idempotencyKey?: string): Promise<FilmSupplier> {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(createFilmSupplierRequestSchema.parse(input))
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }
    const response = await request('/api/v1/film-suppliers', init);
    const created = filmSupplierSchema.parse(await readApiData(response));
    const existing = filmSuppliers.value.some((supplier) => supplier.id === created.id);
    if (!existing) {
      filmSuppliers.value = [...filmSuppliers.value, created].sort((a, b) => a.name.localeCompare(b.name));
    }
    return created;
  }

  async function updateFilmSupplier(id: number, input: UpdateFilmSupplierRequest): Promise<FilmSupplier> {
    const response = await request(`/api/v1/film-suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateFilmSupplierRequestSchema.parse(input))
    });
    const updated = filmSupplierSchema.parse(await readApiData(response));
    filmSuppliers.value = filmSuppliers.value
      .map((supplier) => (supplier.id === id ? updated : supplier))
      .sort((a, b) => a.name.localeCompare(b.name));
    return updated;
  }

  return { filmSuppliers, isLoading, listError, loadFilmSuppliers, createFilmSupplier, updateFilmSupplier };
});
