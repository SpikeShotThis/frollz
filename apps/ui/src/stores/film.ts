import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createFilmJourneyEventRequestSchema,
  filmDetailSchema,
  filmJourneyEventSchema,
  filmListQuerySchema,
  filmSummarySchema,
  filmUpdateRequestSchema,
  type CreateFilmJourneyEventRequest,
  type FilmDetail,
  type FilmJourneyEvent,
  type FilmListQuery,
  type FilmSummary,
  type FilmUpdateRequest,
  type FilmCreateRequest
} from '@frollz2/schema';
import { useApi } from '../composables/useApi.js';

export const useFilmStore = defineStore('film', () => {
  const { request } = useApi();
  const films = ref<FilmSummary[]>([]);
  const currentFilm = ref<FilmDetail | null>(null);
  const currentEvents = ref<FilmJourneyEvent[]>([]);
  const isLoading = ref(false);

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
    try {
      const response = await request(`/api/v1/film${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`);
      films.value = filmSummarySchema.array().parse(await response.json());
    } finally {
      isLoading.value = false;
    }
  }

  async function loadFilm(id: number): Promise<void> {
    const response = await request(`/api/v1/film/${id}`);
    currentFilm.value = filmDetailSchema.parse(await response.json());
    const eventsResponse = await request(`/api/v1/film/${id}/events`);
    currentEvents.value = filmJourneyEventSchema.array().parse(await eventsResponse.json());
  }

  async function createFilm(input: FilmCreateRequest): Promise<void> {
    const response = await request('/api/v1/film', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    currentFilm.value = filmDetailSchema.parse(await response.json());
    await loadFilms();
  }

  async function updateFilm(id: number, input: FilmUpdateRequest): Promise<void> {
    const response = await request(`/api/v1/film/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    filmSummarySchema.parse(await response.json());
    await loadFilms();
  }

  async function addEvent(id: number, input: CreateFilmJourneyEventRequest): Promise<void> {
    const response = await request(`/api/v1/film/${id}/events`, {
      method: 'POST',
      body: JSON.stringify(createFilmJourneyEventRequestSchema.parse(input))
    });
    filmJourneyEventSchema.parse(await response.json());
    await loadFilm(id);
  }

  async function deleteFilm(id: number): Promise<void> {
    await request(`/api/v1/film/${id}`, { method: 'DELETE' });
    currentFilm.value = null;
    currentEvents.value = [];
    await loadFilms();
  }

  return {
    films,
    currentFilm,
    currentEvents,
    isLoading,
    loadFilms,
    loadFilm,
    createFilm,
    updateFilm,
    addEvent,
    deleteFilm
  };
});