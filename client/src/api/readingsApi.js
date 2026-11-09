import { apiRequest } from './client';

export const readingsApi = {
  async getReadings(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.date) query.append('date', params.date);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const endpoint = `/readings${queryString ? `?${queryString}` : ''}`;
    return apiRequest(endpoint, { method: 'GET' });
  },

  async getReadingById(id) {
    return apiRequest(`/readings/${id}`, { method: 'GET' });
  },

  async createReading({ date, slot, value }) {
    return apiRequest('/readings', {
      method: 'POST',
      body: JSON.stringify({ date, slot, value }),
    });
  },

  async updateReading(id, { date, slot, value }) {
    return apiRequest(`/readings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ date, slot, value }),
    });
  },

  async deleteReading(id) {
    return apiRequest(`/readings/${id}`, {
      method: 'DELETE',
    });
  },
};
