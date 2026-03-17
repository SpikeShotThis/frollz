import { api } from './api'
import type { FilmFormat, Stock, Roll, Tag, StockTag } from '@/types'
import { Process } from '@/types'

type CreateStockMultipleFormatsPayload = Pick<Stock, 'brand' | 'manufacturer' | 'speed' | 'baseStockKey' | 'boxImageUrl'> & {
  formatKeys: string[]
  process: Process
}

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
  createMultipleFormats: (data: CreateStockMultipleFormatsPayload) =>
    api.post<Stock[]>('/stocks/bulk', data),
  update: (key: string, data: Partial<Stock>) =>
    api.patch<Stock>(`/stocks/${key}`, data),
  delete: (key: string) => api.delete(`/stocks/${key}`),
  getBrands: (q: string) => api.get<string[]>('/stocks/brands', { params: { q } }),
  getManufacturers: (q: string) => api.get<string[]>('/stocks/manufacturers', { params: { q } }),
  getSpeeds: (q: string) => api.get<number[]>('/stocks/speeds', { params: { q } }),
}

// Tag API
export const tagApi = {
  getAll: () => api.get<Tag[]>('/tags'),
  getById: (key: string) => api.get<Tag>(`/tags/${key}`),
  create: (data: Omit<Tag, '_key' | 'createdAt'>) =>
    api.post<Tag>('/tags', data),
  update: (key: string, data: Partial<Tag>) =>
    api.patch<Tag>(`/tags/${key}`, data),
  delete: (key: string) => api.delete(`/tags/${key}`),
}

// StockTag API
export const stockTagApi = {
  getAll: (params?: { stockKey?: string; tagKey?: string }) =>
    api.get<StockTag[]>('/stock-tags', { params }),
  getById: (key: string) => api.get<StockTag>(`/stock-tags/${key}`),
  create: (data: Omit<StockTag, '_key' | 'createdAt'>) =>
    api.post<StockTag>('/stock-tags', data),
  delete: (key: string) => api.delete(`/stock-tags/${key}`),
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