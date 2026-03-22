import api from './axios';

export const messageApi = {
  getByLead:  (leadId, params) => api.get(`/messages/${leadId}`, { params }),
  send:       (data)           => api.post('/messages/send', data),
  sendAudio:  (leadId, blob)   => {
    const form = new FormData();
    form.append('leadId', leadId);
    form.append('audio',  blob, 'voice.ogg');
    return api.post('/messages/send-audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};