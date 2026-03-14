import api from './axios';

export const authApi = {
  register:      (data) => api.post('/auth/register', data),
  login:         (data) => api.post('/auth/login', data),
  agentLogin:    (data) => api.post('/agents/login', data),   // ← agent login
  getMe:         ()     => api.get('/auth/me'),
  updateWA:      (data) => api.patch('/auth/update-wa', data),
  updateProfile: (data) => api.patch('/auth/update-profile', data),
};