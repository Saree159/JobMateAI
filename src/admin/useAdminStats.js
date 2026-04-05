import { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin';

export function useAdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

export function useAdminUsersList(limit = 50) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminApi.getUsersList(limit)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [limit, tick]);

  return { users, loading, refetch: () => setTick(t => t + 1) };
}
