import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createFilmJourneyEventRequestSchema,
  filmDetailSchema,
  filmJourneyEventSchema,
  filmSummarySchema,
  type CreateFilmJourneyEventRequest,
  type FilmDetail,
  type FilmJourneyEvent,
  type FilmListQuery,
  type FilmSummary,
  type FilmUpdateRequest,
  type FilmCreateRequest
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';
import { readApiData } from '../composables/api-envelope.js';

export const useFilmStore = defineStore('film', () => {
  const { request } = useApi();
  const films = ref<FilmSummary[]>([]);
  const currentFilm = ref<FilmDetail | null>(null);
  const currentEvents = ref<FilmJourneyEvent[]>([]);
  const isLoading = ref(false);
  const isDetailLoading = ref(false);
  const filmsError = ref<string | null>(null);
  const detailError = ref<string | null>(null);

  async function loadFilms(query: FilmListQuery = {}): Promise<void> {
    const searchParams = new URLSearchParams();

    if (query.stateCode) {
      searchParams.set('stateCode', query.stateCode);
    }
    if (query.filmFormatId) {
      searchParams.set('filmFormatId', String(query.filmFormatId));
    }
    if (query.emulsionId) {
      searchParams.set('emulsionId', String(query.emulsionId));
    }

    isLoading.value = true;
    filmsError.value = null;
    try {
      const response = await request(`/api/v1/film${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`);
      films.value = filmSummarySchema.array().parse(await readApiData(response));
    } catch (error) {
      filmsError.value = error instanceof Error ? error.message : 'Failed to load films';
      films.value = [];
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadFilm(id: number): Promise<void> {
    isDetailLoading.value = true;
    detailError.value = null;
    try {
      const response = await request(`/api/v1/film/${id}`);
      currentFilm.value = filmDetailSchema.parse(await readApiData(response));
      const eventsResponse = await request(`/api/v1/film/${id}/events`);
      currentEvents.value = filmJourneyEventSchema.array().parse(await readApiData(eventsResponse));
    } catch (error) {
      detailError.value = error instanceof Error ? error.message : 'Failed to load film detail';
      currentFilm.value = null;
      currentEvents.value = [];
      throw error;
    } finally {
      isDetailLoading.value = false;
    }
  }

  async function createFilm(input: FilmCreateRequest, idempotencyKey?: string): Promise<void> {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(input)
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request('/api/v1/film', init);
    currentFilm.value = filmDetailSchema.parse(await readApiData(response));
    await loadFilms();
  }

  async function updateFilm(id: number, input: FilmUpdateRequest): Promise<void> {
    const response = await request(`/api/v1/film/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    filmSummarySchema.parse(await readApiData(response));
    await loadFilms();
  }

  async function addEvent(id: number, input: CreateFilmJourneyEventRequest, idempotencyKey?: string): Promise<void> {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(createFilmJourneyEventRequestSchema.parse(input))
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request(`/api/v1/film/${id}/events`, init);
    filmJourneyEventSchema.parse(await readApiData(response));
    await loadFilm(id);
  }

  return {
    films,
    currentFilm,
    currentEvents,
    isLoading,
    isDetailLoading,
    filmsError,
    detailError,
    loadFilms,
    loadFilm,
    createFilm,
    updateFilm,
    addEvent
  };
});
