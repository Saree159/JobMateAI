const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'changeme-admin';

async function get(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'X-Admin-Key': ADMIN_KEY },
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

async function post(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'X-Admin-Key': ADMIN_KEY },
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

export const adminApi = {
  getStats: () => get('/api/admin/stats'),
  getUsersList: (limit = 50, offset = 0) => get(`/api/admin/users/list?limit=${limit}&offset=${offset}`),
  getUsersDetail: (limit = 100, offset = 0, search = '') => {
    const params = new URLSearchParams({ limit, offset });
    if (search) params.set('search', search);
    return get(`/api/admin/users/detail?${params}`);
  },
  getUserAnalytics: () => get('/api/admin/user-analytics'),
  getUserActivity: (userId, limit = 150) => get(`/api/admin/users/${userId}/activity?limit=${limit}`),
  backfillEvents: () => post('/api/admin/backfill-events'),
  getBehaviorSummary: (days = 30) => get(`/api/admin/behavior/summary?days=${days}`),
  getBehaviorStream: (limit = 60) => get(`/api/admin/behavior/stream?limit=${limit}`),
  getBehaviorPerUser: (days = 30) => get(`/api/admin/behavior/per-user?days=${days}`),
};
