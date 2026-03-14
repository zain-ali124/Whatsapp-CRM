import api from './axios';

export const leadApi = {
  getAll:     (params)    => api.get('/leads', { params }),
  getOne:     (id)        => api.get(`/leads/${id}`),
  create:     (data)      => api.post('/leads', data),
  update:     (id, data)  => api.patch(`/leads/${id}`, data),
  assign:     (id, data)  => api.patch(`/leads/${id}/assign`, data),    // ← new
  setReminder:(id, data)  => api.patch(`/leads/${id}/reminder`, data),  // ← new
  delete:     (id)        => api.delete(`/leads/${id}`),
  bulkAssign: (data)      => api.post('/leads/bulk-assign', data),      // POST not PATCH
};