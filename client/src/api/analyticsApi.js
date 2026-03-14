import api from './axios';

export const analyticsApi = {
  dashboard:     ()       => api.get('/analytics/dashboard'),
  sources:       ()       => api.get('/analytics/sources'),
  agents:        ()       => api.get('/analytics/agents'),
  funnel:        ()       => api.get('/analytics/funnel'),
  leadsOverTime: (params) => api.get('/analytics/leads-over-time', { params }),
};