import { api } from './api'
import type { Format, Package, Process, Emulsion, Film, FilmState, Tag, FilmTag, TransitionGraph, TransitionProfile } from '@/types'

// Format API (replaces filmFormatApi)
export const formatApi = {
  getAll: () => api.get<Format[]>('/formats'),
  getById: (id: number) => api.get<Format>(`/formats/${id}`),
  create: (data: { packageId: number; name: string }) => api.post<Format>('/formats', data),
  update: (id: number, data: Partial<{ packageId: number; name: string }>) =>
    api.patch<Format>(`/formats/${id}`, data),
  delete: (id: number) => api.delete(`/formats/${id}`),
}

// Package API
export const packageApi = {
  getAll: () => api.get<Package[]>('/packages'),
}

// Process API
export const processApi = {
  getAll: () => api.get<Process[]>('/processes'),
}

// Emulsion API (replaces stockApi)
export const emulsionApi = {
  getAll: () => api.get<Emulsion[]>('/emulsions'),
  getById: (id: number) => api.get<Emulsion>(`/emulsions/${id}`),
  create: (data: { name: string; brand: string; manufacturer: string; speed: number; processId: number; formatId: number; parentId?: string }) =>
    api.post<Emulsion>('/emulsions', data),
  createBulk: (data: { name: string; brand: string; manufacturer: string; speed: number; processId: number; formatIds: string[]; parentId?: string }) =>
    api.post<Emulsion[]>('/emulsions/bulk', data),
  update: (id: number, data: Partial<{ name: string; brand: string; manufacturer: string; speed: number; processId: number; formatId: number }>) =>
    api.patch<Emulsion>(`/emulsions/${id}`, data),
  uploadBoxImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.put<void>(`/emulsions/${id}/box-image`, form)
  },
  delete: (id: number) => api.delete(`/emulsions/${id}`),
  addTag: (id: number, tagId: number) => api.post(`/emulsions/${id}/tags`, { tagId }),
  removeTag: (id: number, tagId: number) => api.delete(`/emulsions/${id}/tags/${tagId}`),
  getBrands: (q: string) => api.get<string[]>('/emulsions/brands', { params: { q } }),
  getManufacturers: (q: string) => api.get<string[]>('/emulsions/manufacturers', { params: { q } }),
  getSpeeds: (q: string) => api.get<number[]>('/emulsions/speeds', { params: { q } }),
}

// Tag API
export const tagApi = {
  getAll: () => api.get<Tag[]>('/tags'),
  getById: (id: number) => api.get<Tag>(`/tags/${id}`),
  create: (data: { name: string; colorCode: string; description?: string }) =>
    api.post<Tag>('/tags', data),
  update: (id: number, data: Partial<{ name: string; colorCode: string; description: string }>) =>
    api.patch<Tag>(`/tags/${id}`, data),
  delete: (id: number) => api.delete(`/tags/${id}`),
}

// FilmTag API (replaces rollTagApi)
export const filmTagApi = {
  getAll: (params?: { filmId?: number; tagId?: number }) =>
    api.get<FilmTag[]>('/film-tags', { params }),
  create: (data: { filmId: number; tagId: number }) =>
    api.post<FilmTag>('/film-tags', data),
  delete: (id: number) => api.delete(`/film-tags/${id}`),
}

// Film API (replaces rollApi)
export const filmApi = {
  getAll: (params?: { state?: string[]; emulsionId?: number; formatId?: number; tagId?: number[]; from?: string; to?: string; q?: string }) =>
    api.get<Film[]>('/films', {
      params,
      paramsSerializer: { indexes: null },
    }),
  getById: (id: number) => api.get<Film>(`/films/${id}`),
  getChildren: (id: number) => api.get<Film[]>(`/films/${id}/children`),
  create: (data: { name: string; emulsionId?: string; expirationDate?: string; parentId?: string; transitionProfileId: number }) =>
    api.post<Film>('/films', data),
  update: (id: number, data: Partial<{ name: string; emulsionId: number; expirationDate: string; transitionProfileId: number }>) =>
    api.patch<Film>(`/films/${id}`, data),
  delete: (id: number) => api.delete(`/films/${id}`),
  transition: (id: number, targetStateName: string, date?: string, note?: string, metadata?: Record<string, string | string[]>) =>
    api.post<Film>(`/films/${id}/transition`, { targetStateName, date, note, metadata }),
  addTag: (id: number, tagId: number) => api.post(`/films/${id}/tags`, { tagId }),
  removeTag: (id: number, tagId: number) => api.delete(`/films/${id}/tags/${tagId}`),
}

// FilmState API (replaces rollStateApi)
export const filmStateApi = {
  getByFilmId: (filmId: number) =>
    api.get<FilmState[]>('/film-states', { params: { filmId } }),
}

// Export API
export const exportApi = {
  filmsJsonPath: '/export/films.json',
}

// Transition API
export const transitionApi = {
  getProfiles: () => api.get<TransitionProfile[]>('/transitions/profiles'),
  getGraph: (profile = 'standard') =>
    api.get<TransitionGraph>('/transitions', { params: { profile } }),
}
