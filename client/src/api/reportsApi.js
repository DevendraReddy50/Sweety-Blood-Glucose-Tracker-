import { apiRequest } from './client';

export const reportsApi = {
  async getReports(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiRequest(`/reports${query}`, { method: 'GET' });
  },
};
