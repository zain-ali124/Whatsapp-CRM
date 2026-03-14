import api from './axios';

export const templateApi = {
  getAll: (params) => api.get('/templates', { params }),
  getOne: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.patch(`/templates/${id}`, data),
  remove: (id) => api.delete(`/templates/${id}`),
  markUsed: (id) => api.post(`/templates/${id}/use`),
  toggleFavourite: (id) => api.post(`/templates/${id}/toggle-favourite`),
};