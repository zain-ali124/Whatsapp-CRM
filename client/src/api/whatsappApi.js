import api from './axios';

export const whatsappApi = {
  getConnection: () => api.get('/whatsapp/connection'),
  connect: (payload) => api.post('/whatsapp/connect', payload),
  sendTestMessage: (payload) => api.post('/whatsapp/test-message', payload),
};
