import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createFilmLabRequestSchema,
  filmLabSchema,
  listFilmLabsQuerySchema,
  updateFilmLabRequestSchema,
  type CreateFilmLabRequest,
  type FilmLab,
  type ListFilmLabsQuery,
  type UpdateFilmLabRequest
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useFilmLabsStore = defineStore('film-labs', () => {
  const { request } = useApi();
  const filmLabs = ref<FilmLab[]>([]);
  const isLoading = ref(false);
  const listError = ref<string | null>(null);

  async function loadFilmLabs(query: Partial<ListFilmLabsQuery> = {}): Promise<void> {
    isLoading.value = true;
    listError.value = null;
    try {
      const parsed = listFilmLabsQuerySchema.parse(query);
      const params = new URLSearchParams({
        q: parsed.q,
        includeInactive: String(parsed.includeInactive),
        limit: String(parsed.limit)
      });
      const response = await request(`/api/v1/film-labs?${params.toString()}`);
      filmLabs.value = filmLabSchema.array().parse(await readApiData(response));
    } catch (error) {
      listError.value = error instanceof Error ? error.message : 'Failed to load film labs';
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function createFilmLab(input: CreateFilmLabRequest): Promise<FilmLab> {
    const response = await request('/api/v1/film-labs', {
      method: 'POST',
      body: JSON.stringify(createFilmLabRequestSchema.parse(input))
    });
    const created = filmLabSchema.parse(await readApiData(response));
    const existing = filmLabs.value.some((lab) => lab.id === created.id);
    if (!existing) {
      filmLabs.value = [...filmLabs.value, created].sort((a, b) => a.name.localeCompare(b.name));
    }
    return created;
  }

  async function updateFilmLab(id: number, input: UpdateFilmLabRequest): Promise<FilmLab> {
    const response = await request(`/api/v1/film-labs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateFilmLabRequestSchema.parse(input))
    });
    const updated = filmLabSchema.parse(await readApiData(response));
    filmLabs.value = filmLabs.value.map((lab) => (lab.id === id ? updated : lab)).sort((a, b) => a.name.localeCompare(b.name));
    return updated;
  }

  return { filmLabs, isLoading, listError, loadFilmLabs, createFilmLab, updateFilmLab };
});
