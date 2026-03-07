/**
 * Tests for the jobmate API client (jobmate.js).
 * All network calls are mocked with vi.stubGlobal / vi.fn.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── We test the named exports directly ──────────────────────────────────────
import { userApi, jobApi } from '@/api/jobmate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetch(body, status = 200) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
  };
  return vi.fn().mockResolvedValue(response);
}

function mockFetchError(status, detail = 'Error') {
  const response = {
    ok: false,
    status,
    json: async () => ({ detail }),
  };
  return vi.fn().mockResolvedValue(response);
}

// ---------------------------------------------------------------------------
// userApi
// ---------------------------------------------------------------------------
describe('userApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({ id: 1, email: 'a@test.com', skills: [] }));
    // Prevent 401 handler from redirecting in tests
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('create() POSTs to /api/users', async () => {
    const user = await userApi.create({ email: 'a@test.com', password: 'pass' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(user.email).toBe('a@test.com');
  });

  it('getById() GETs /api/users/:id', async () => {
    const user = await userApi.getById(42);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/42'),
      expect.anything()
    );
    expect(user.id).toBe(1);
  });

  it('update() PUTs to /api/users/:id', async () => {
    await userApi.update(1, { target_role: 'Dev' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('delete() DELETEs /api/users/:id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => null }));
    await userApi.delete(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('login() POSTs to /api/users/login', async () => {
    vi.stubGlobal('fetch', mockFetch({ access_token: 'tok', token_type: 'bearer' }));
    const resp = await userApi.login('a@test.com', 'pass');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/login'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(resp.access_token).toBe('tok');
  });

  it('throws on 4xx error response', async () => {
    vi.stubGlobal('fetch', mockFetchError(400, 'Email already registered'));
    await expect(userApi.create({ email: 'dup@test.com', password: 'p' })).rejects.toThrow(
      'Email already registered'
    );
  });
});

// ---------------------------------------------------------------------------
// jobApi
// ---------------------------------------------------------------------------
describe('jobApi', () => {
  const mockJob = { id: 10, title: 'Dev', company: 'Co', status: 'saved' };

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch(mockJob));
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('create() POSTs to /api/users/:userId/jobs', async () => {
    const job = await jobApi.create(5, { title: 'Dev', company: 'Co', description: 'Desc' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/5/jobs'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(job.id).toBe(10);
  });

  it('listByUser() GETs /api/users/:userId/jobs', async () => {
    vi.stubGlobal('fetch', mockFetch([mockJob]));
    const jobs = await jobApi.listByUser(5);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/5/jobs'),
      expect.anything()
    );
    expect(Array.isArray(jobs)).toBe(true);
  });

  it('update() PUTs to /api/jobs/:id', async () => {
    await jobApi.update(10, { status: 'applied' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/10'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('delete() DELETEs /api/jobs/:id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => null }));
    await jobApi.delete(10);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/10'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('calculateMatchScore() POSTs to /api/jobs/:id/match', async () => {
    vi.stubGlobal('fetch', mockFetch({ match_score: 85, matched_skills: ['Python'], missing_skills: [] }));
    const result = await jobApi.calculateMatchScore(10);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/10/match'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.match_score).toBe(85);
  });
});
