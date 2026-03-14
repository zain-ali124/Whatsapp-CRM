import api from './axios';

export const agentApi = {
  getAll:  ()       => api.get('/agents'),
  getOne:  (id)     => api.get(`/agents/${id}`),
  invite:  (data)   => api.post('/agents/invite', data),
  update:  (id, d)  => api.patch(`/agents/${id}`, d),
  remove:  (id)     => api.delete(`/agents/${id}`),
};
