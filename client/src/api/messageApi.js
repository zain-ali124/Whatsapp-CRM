import api from './axios';

export const messageApi = {
  getByLead: (leadId, params) => api.get(`/messages/${leadId}`, { params }),
  send:      (data)           => api.post('/messages/send', data),
};
