import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createFrameJourneyEventRequestSchema,
  createFilmJourneyEventRequestSchema,
  filmDetailSchema,
  filmListResponseSchema,
  filmLotDetailSchema,
  filmSummarySchema,
  frameJourneyEventSchema,
  filmFrameSchema,
  filmJourneyEventSchema,
  type CreateFrameJourneyEventRequest,
  type CreateFilmJourneyEventRequest,
  type FilmDetail,
  type FilmFrame,
  type FilmJourneyEvent,
  type FilmListQuery,
  type FilmSummary,
  type FrameJourneyEvent,
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
  const currentFrames = ref<FilmFrame[]>([]);
  const currentFrameEvents = ref<FrameJourneyEvent[]>([]);
  const isLoading = ref(false);
  const isDetailLoading = ref(false);
  const filmsError = ref<string | null>(null);
  const detailError = ref<string | null>(null);
  let loadFilmsInFlight: Promise<void> | null = null;
  let loadFilmInFlight: Promise<void> | null = null;
  let loadFilmInFlightId: number | null = null;

  async function loadFilms(query: Partial<FilmListQuery> = {}): Promise<void> {
    if (loadFilmsInFlight) {
      return loadFilmsInFlight;
    }

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
    loadFilmsInFlight = (async () => {
      try {
        const response = await request(`/api/v1/film${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`);
        const result = filmListResponseSchema.parse(await readApiData(response));
        films.value = result.items;
      } catch (error) {
        filmsError.value = error instanceof Error ? error.message : 'Failed to load films';
        films.value = [];
        throw error;
      } finally {
        isLoading.value = false;
        loadFilmsInFlight = null;
      }
    })();

    return loadFilmsInFlight;
  }

  async function loadFilm(id: number): Promise<void> {
    if (loadFilmInFlight && loadFilmInFlightId === id) {
      return loadFilmInFlight;
    }

    isDetailLoading.value = true;
    detailError.value = null;
    loadFilmInFlightId = id;
    loadFilmInFlight = (async () => {
      try {
        const response = await request(`/api/v1/film/${id}`);
        currentFilm.value = filmDetailSchema.parse(await readApiData(response));
        const eventsResponse = await request(`/api/v1/film/${id}/events`);
        currentEvents.value = filmJourneyEventSchema.array().parse(await readApiData(eventsResponse));
        const framesResponse = await request(`/api/v1/film/${id}/frames`);
        currentFrames.value = filmFrameSchema.array().parse(await readApiData(framesResponse));
      } catch (error) {
        detailError.value = error instanceof Error ? error.message : 'Failed to load film detail';
        currentFilm.value = null;
        currentEvents.value = [];
        currentFrames.value = [];
        currentFrameEvents.value = [];
        throw error;
      } finally {
        isDetailLoading.value = false;
        loadFilmInFlight = null;
        loadFilmInFlightId = null;
      }
    })();

    return loadFilmInFlight;
  }

  async function createFilm(input: FilmCreateRequest, idempotencyKey?: string): Promise<void> {
    const lotPayload = {
      emulsionId: input.emulsionId,
      packageTypeId: input.packageTypeId,
      filmFormatId: input.filmFormatId,
      quantity: 1,
      expirationDate: input.expirationDate,
      films: [{ name: input.name }]
    };
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(lotPayload)
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request('/api/v1/film/lots', init);
    filmLotDetailSchema.parse(await readApiData(response));
    try {
      await loadFilms();
    } catch {
      // Preserve create success; list refresh can be retried by caller/page lifecycle.
    }
  }

  async function updateFilm(id: number, input: FilmUpdateRequest): Promise<void> {
    const response = await request(`/api/v1/film/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    const updated = filmSummarySchema.parse(await readApiData(response));
    try {
      await loadFilms();
    } catch {
      films.value = films.value.map((item) => (item.id === id ? updated : item));
      if (currentFilm.value?.id === id) {
        currentFilm.value = {
          ...currentFilm.value,
          ...updated
        };
      }
    }
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
    const created = filmJourneyEventSchema.parse(await readApiData(response));
    try {
      await loadFilm(id);
    } catch {
      currentEvents.value = [...currentEvents.value, created];
    }
  }

  async function addFrameEvent(
    id: number,
    frameId: number,
    input: CreateFrameJourneyEventRequest,
    idempotencyKey?: string
  ): Promise<void> {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(createFrameJourneyEventRequestSchema.parse(input))
    };
    if (idempotencyKey) {
      init.headers = { 'idempotency-key': idempotencyKey };
    }

    const response = await request(`/api/v1/film/${id}/frames/${frameId}/events`, init);
    const created = frameJourneyEventSchema.parse(await readApiData(response));
    try {
      await loadFilm(id);
    } catch {
      currentFrameEvents.value = [...currentFrameEvents.value, created];
    }
  }

  return {
    films,
    currentFilm,
    currentEvents,
    currentFrames,
    currentFrameEvents,
    isLoading,
    isDetailLoading,
    filmsError,
    detailError,
    loadFilms,
    loadFilm,
    createFilm,
    updateFilm,
    addEvent,
    addFrameEvent
  };
});
