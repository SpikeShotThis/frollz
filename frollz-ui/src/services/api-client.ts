import { api } from './api'
import type { FilmFormat, Stock, Roll } from '@/types'

// Film Format API
export const filmFormatApi = {
  getAll: () => api.get<FilmFormat[]>('/film-formats'),
  getById: (key: string) => api.get<FilmFormat>(`/film-formats/${key}`),
  create: (data: Omit<FilmFormat, '_key' | 'createdAt' | 'updatedAt'>) => 
    api.post<FilmFormat>('/film-formats', data),
  update: (key: string, data: Partial<FilmFormat>) => 
    api.patch<FilmFormat>(`/film-formats/${key}`, data),
  delete: (key: string) => api.delete(`/film-formats/${key}`),
}

// Stock API
export const stockApi = {
  getAll: () => api.get<Stock[]>('/stocks'),
  getById: (key: string) => api.get<Stock>(`/stocks/${key}`),
  create: (data: Omit<Stock, '_key' | 'createdAt' | 'updatedAt'>) => 
    api.post<Stock>('/stocks', data),
  update: (key: string, data: Partial<Stock>) => 
    api.patch<Stock>(`/stocks/${key}`, data),
  delete: (key: string) => api.delete(`/stocks/${key}`),
}

// Roll API
export const rollApi = {
  getAll: () => api.get<Roll[]>('/rolls'),
  getById: (key: string) => api.get<Roll>(`/rolls/${key}`),
  create: (data: Omit<Roll, '_key' | 'createdAt' | 'updatedAt'>) => 
    api.post<Roll>('/rolls', data),
  update: (key: string, data: Partial<Roll>) => 
    api.patch<Roll>(`/rolls/${key}`, data),
  delete: (key: string) => api.delete(`/rolls/${key}`),
}