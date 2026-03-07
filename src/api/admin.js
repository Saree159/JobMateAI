const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function get(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

export const adminApi = {
  getStats: () => get('/api/admin/stats'),
  getUsersList: (limit = 50, offset = 0) => get(`/api/admin/users/list?limit=${limit}&offset=${offset}`),
};
