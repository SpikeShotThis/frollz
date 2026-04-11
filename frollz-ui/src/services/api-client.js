import { api } from './api';
// Format API (replaces filmFormatApi)
export const formatApi = {
    getAll: () => api.get('/formats'),
    getById: (id) => api.get(`/formats/${id}`),
    create: (data) => api.post('/formats', data),
    update: (id, data) => api.patch(`/formats/${id}`, data),
    delete: (id) => api.delete(`/formats/${id}`),
};
// Package API
export const packageApi = {
    getAll: () => api.get('/packages'),
};
// Process API
export const processApi = {
    getAll: () => api.get('/processes'),
};
// Emulsion API (replaces stockApi)
export const emulsionApi = {
    getAll: () => api.get('/emulsions'),
    getById: (id) => api.get(`/emulsions/${id}`),
    create: (data) => api.post('/emulsions', data),
    createBulk: (data) => api.post('/emulsions/bulk', data),
    update: (id, data) => api.patch(`/emulsions/${id}`, data),
    delete: (id) => api.delete(`/emulsions/${id}`),
    getBrands: (q) => api.get('/emulsions/brands', { params: { q } }),
    getManufacturers: (q) => api.get('/emulsions/manufacturers', { params: { q } }),
    getSpeeds: (q) => api.get('/emulsions/speeds', { params: { q } }),
};
// Tag API
export const tagApi = {
    getAll: () => api.get('/tags'),
    getById: (id) => api.get(`/tags/${id}`),
    create: (data) => api.post('/tags', data),
    update: (id, data) => api.patch(`/tags/${id}`, data),
    delete: (id) => api.delete(`/tags/${id}`),
};
// EmulsionTag API (replaces stockTagApi)
export const emulsionTagApi = {
    getAll: (params) => api.get('/emulsion-tags', { params }),
    create: (data) => api.post('/emulsion-tags', data),
    delete: (id) => api.delete(`/emulsion-tags/${id}`),
};
// FilmTag API (replaces rollTagApi)
export const filmTagApi = {
    getAll: (params) => api.get('/film-tags', { params }),
    create: (data) => api.post('/film-tags', data),
    delete: (id) => api.delete(`/film-tags/${id}`),
};
// Film API (replaces rollApi)
export const filmApi = {
    getAll: (params) => api.get('/films', {
        params,
        paramsSerializer: { indexes: null },
    }),
    getById: (id) => api.get(`/films/${id}`),
    getChildren: (id) => api.get(`/films/${id}/children`),
    create: (data) => api.post('/films', data),
    update: (id, data) => api.patch(`/films/${id}`, data),
    delete: (id) => api.delete(`/films/${id}`),
    transition: (id, targetStateName, date, note) => api.post(`/films/${id}/transition`, { targetStateName, date, note }),
    addTag: (id, tagId) => api.post(`/films/${id}/tags`, { tagId }),
    removeTag: (id, tagId) => api.delete(`/films/${id}/tags/${tagId}`),
};
// FilmState API (replaces rollStateApi)
export const filmStateApi = {
    getByfilmId: (filmId) => api.get('/film-states', { params: { filmId } }),
};
// Transition API
export const transitionApi = {
    getProfiles: () => api.get('/transitions/profiles'),
    getGraph: (profile = 'standard') => api.get('/transitions', { params: { profile } }),
};
