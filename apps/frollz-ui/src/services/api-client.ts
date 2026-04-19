import { z } from "zod";
import {
  Format,
  Package,
  Process,
  Emulsion,
  Film,
  FilmState,
  Tag,
  FilmTag,
  TransitionGraph,
  TransitionProfile,
  StateCount,
  MonthCount,
  EmulsionCount,
  TransitionDuration,
  Camera,
  type CameraStatus,
  type CreateCameraInput,
  type UpdateCameraInput,
} from "@frollz/shared";
import { api, apiFetch } from "./api";

// Format API
export const formatApi = {
  getAll: () => apiFetch(Format.array(), "GET", "/formats"),
  getById: (id: number) => apiFetch(Format, "GET", `/formats/${id}`),
  create: (data: { packageId: number; name: string }) =>
    apiFetch(Format, "POST", "/formats", data),
  update: (id: number, data: Partial<{ packageId: number; name: string }>) =>
    apiFetch(Format, "PATCH", `/formats/${id}`, data),
  delete: (id: number) => api.delete(`/formats/${id}`),
};

// Package API
export const packageApi = {
  getAll: () => apiFetch(Package.array(), "GET", "/packages"),
};

// Process API
export const processApi = {
  getAll: () => apiFetch(Process.array(), "GET", "/processes"),
};

// Emulsion API
export const emulsionApi = {
  getAll: () => apiFetch(Emulsion.array(), "GET", "/emulsions"),
  getById: (id: number) => apiFetch(Emulsion, "GET", `/emulsions/${id}`),
  create: (data: {
    brand: string;
    manufacturer: string;
    speed: number;
    processId: number;
    formatId: number;
    parentId?: number;
  }) => apiFetch(Emulsion, "POST", "/emulsions", data),
  createBulk: (data: {
    brand: string;
    manufacturer: string;
    speed: number;
    processId: number;
    formatIds: number[];
    parentId?: number;
  }) => apiFetch(Emulsion.array(), "POST", "/emulsions/bulk", data),
  update: (
    id: number,
    data: Partial<{
      brand: string;
      manufacturer: string;
      speed: number;
      processId: number;
      formatId: number;
    }>,
  ) => apiFetch(Emulsion, "PATCH", `/emulsions/${id}`, data),
  uploadBoxImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.put<void>(`/emulsions/${id}/box-image`, form);
  },
  delete: (id: number) => api.delete(`/emulsions/${id}`),
  addTag: (id: number, tagId: number) =>
    api.post(`/emulsions/${id}/tags`, { tagId }),
  removeTag: (id: number, tagId: number) =>
    api.delete(`/emulsions/${id}/tags/${tagId}`),
  getBrands: (q: string) =>
    apiFetch(z.string().array(), "GET", "/emulsions/brands", undefined, { q }),
  getManufacturers: (q: string) =>
    apiFetch(z.string().array(), "GET", "/emulsions/manufacturers", undefined, {
      q,
    }),
  getSpeeds: (q: string) =>
    apiFetch(z.number().array(), "GET", "/emulsions/speeds", undefined, { q }),
};

const normalizeTag = (tag: Tag) => ({
  ...tag,
  description: tag.description ?? "",
});

// Tag API
export const tagApi = {
  getAll: () =>
    apiFetch(Tag.array(), "GET", "/tags").then((result) => ({
      data: result.data.map(normalizeTag),
    })),
  getById: (id: number) =>
    apiFetch(Tag, "GET", `/tags/${id}`).then((result) => ({
      data: normalizeTag(result.data),
    })),
  create: (data: { name: string; colorCode: string; description?: string }) =>
    apiFetch(Tag, "POST", "/tags", data).then((result) => ({
      data: normalizeTag(result.data),
    })),
  update: (
    id: number,
    data: Partial<{ name: string; colorCode: string; description: string }>,
  ) =>
    apiFetch(Tag, "PATCH", `/tags/${id}`, data).then((result) => ({
      data: normalizeTag(result.data),
    })),
  delete: (id: number) => api.delete(`/tags/${id}`),
};

// FilmTag API
export const filmTagApi = {
  getAll: (params?: { filmId?: number; tagId?: number }) =>
    apiFetch(FilmTag.array(), "GET", "/film-tags", undefined, params),
  create: (data: { filmId: number; tagId: number }) =>
    apiFetch(FilmTag, "POST", "/film-tags", data),
  delete: (id: number) => api.delete(`/film-tags/${id}`),
};

// Film API
export const filmApi = {
  getAll: (params?: {
    state?: string[];
    emulsionId?: number;
    formatId?: number;
    tagId?: number[];
    from?: string;
    to?: string;
    q?: string;
    cameraId?: number;
  }) => apiFetch(Film.array(), "GET", "/films", undefined, params),
  getById: (id: number) => apiFetch(Film, "GET", `/films/${id}`),
  getChildren: (id: number) =>
    apiFetch(Film.array(), "GET", `/films/${id}/children`),
  create: (data: {
    name: string;
    emulsionId?: number;
    expirationDate?: string;
    parentId?: number;
    transitionProfileId: number;
  }) => apiFetch(Film, "POST", "/films", data),
  update: (
    id: number,
    data: Partial<{
      name: string;
      emulsionId: number;
      expirationDate: string;
      transitionProfileId: number;
    }>,
  ) => apiFetch(Film, "PATCH", `/films/${id}`, data),
  delete: (id: number) => api.delete(`/films/${id}`),
  transition: (
    id: number,
    targetStateName: string,
    date?: string,
    note?: string,
    metadata?: Record<string, string | string[]>,
  ) =>
    apiFetch(Film, "POST", `/films/${id}/transition`, {
      targetStateName,
      date,
      note,
      metadata,
    }),
  addTag: (id: number, tagId: number) =>
    api.post(`/films/${id}/tags`, { tagId }),
  removeTag: (id: number, tagId: number) =>
    api.delete(`/films/${id}/tags/${tagId}`),
};

// FilmState API
export const filmStateApi = {
  getByFilmId: (filmId: number) =>
    apiFetch(FilmState.array(), "GET", "/film-states", undefined, { filmId }),
};

// Export API
export const exportApi = {
  filmsJsonPath: "/export/films.json",
  libraryJsonPath: "/export/library.json",
};

// Import API
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const ImportFilmsResult = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z.array(z.object({ row: z.number(), reason: z.string() })),
});

const ImportLibraryResult = z.object({
  tags: z.object({ imported: z.number(), skipped: z.number() }),
  formats: z.object({ imported: z.number(), skipped: z.number() }),
  emulsions: z.object({ imported: z.number(), skipped: z.number() }),
  errors: z.array(
    z.object({ entity: z.string(), index: z.number(), reason: z.string() }),
  ),
});

const ImportFilmsJsonResult = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z.array(
    z.object({ index: z.number(), name: z.string(), reason: z.string() }),
  ),
});

export const importApi = {
  templateUrl: `${API_BASE_URL}/import/films/template`,
  importFilms: (file: File) => {
    const form = new FormData();
    form.append("csv", file);
    return apiFetch(ImportFilmsResult, "POST", "/import/films", form);
  },
  importLibrary: (file: File) => {
    const form = new FormData();
    form.append("library", file);
    return apiFetch(ImportLibraryResult, "POST", "/import/library", form);
  },
  importFilmsJson: (file: File) => {
    const form = new FormData();
    form.append("films", file);
    return apiFetch(ImportFilmsJsonResult, "POST", "/import/films/json", form);
  },
};

// Film Stats API
export const filmStatsApi = {
  byState: () => apiFetch(StateCount.array(), "GET", "/films/stats/by-state"),
  byMonth: (months = 12) =>
    apiFetch(MonthCount.array(), "GET", "/films/stats/by-month", undefined, {
      months,
    }),
  byEmulsion: () =>
    apiFetch(EmulsionCount.array(), "GET", "/films/stats/by-emulsion"),
  lifecycleDurations: () =>
    apiFetch(
      TransitionDuration.array(),
      "GET",
      "/films/stats/lifecycle-durations",
    ),
};

// Camera API
export const cameraApi = {
  getAll: (params?: {
    brand?: string;
    model?: string;
    status?: CameraStatus;
    formatId?: number;
    unloaded?: boolean;
  }) => {
    const { unloaded, ...rest } = params ?? {};
    const p: Record<string, string | number | string[] | number[] | undefined> =
      { ...rest };
    if (unloaded !== undefined) p.unloaded = String(unloaded);
    return apiFetch(Camera.array(), "GET", "/cameras", undefined, p);
  },
  getById: (id: number) => apiFetch(Camera, "GET", `/cameras/${id}`),
  create: (data: CreateCameraInput) =>
    apiFetch(Camera, "POST", "/cameras", data),
  update: (id: number, data: UpdateCameraInput) =>
    apiFetch(Camera, "PATCH", `/cameras/${id}`, data),
  delete: (id: number) => api.delete(`/cameras/${id}`),
};

// Transition API
export const transitionApi = {
  getProfiles: () =>
    apiFetch(TransitionProfile.array(), "GET", "/transitions/profiles"),
  getGraph: (profile = "standard") =>
    apiFetch(TransitionGraph, "GET", "/transitions", undefined, { profile }),
};
