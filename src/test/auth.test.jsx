/**
 * Tests for AuthContext (useAuth hook).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

// ── Minimal consumer component ────────────────────────────────────────────
function AuthDisplay() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <div>loading</div>;
  if (!isAuthenticated) return <div>not-authenticated</div>;
  return <div>authenticated-{user?.email}</div>;
}

// ── Fake localStorage ──────────────────────────────────────────────────────
function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: vi.fn((k) => store[k] ?? null),
    setItem: vi.fn((k, v) => { store[k] = v; }),
    removeItem: vi.fn((k) => { delete store[k]; }),
    _store: store,
  };
}

// ── Stub fetch (userApi.getById is called on login) ─────────────────────────
function stubFetch(responses) {
  let idx = 0;
  return vi.fn().mockImplementation(() => {
    const r = responses[idx] ?? responses[responses.length - 1];
    idx++;
    return Promise.resolve(r);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthProvider — initial state', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows unauthenticated when no token in storage', async () => {
    vi.stubGlobal('localStorage', makeStorage());
    render(<AuthProvider><AuthDisplay /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByText('not-authenticated')).toBeTruthy();
    });
  });

  it('restores session from localStorage when token + user exist', async () => {
    const storedUser = { id: 1, email: 'alice@test.com', skills: [] };
    vi.stubGlobal('localStorage', makeStorage({
      hirematex_auth_token: 'mock-token',
      hirematex_user: JSON.stringify(storedUser),
    }));

    render(<AuthProvider><AuthDisplay /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByText('authenticated-alice@test.com')).toBeTruthy();
    });
  });
});

describe('AuthProvider — getToken', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when no token stored', async () => {
    vi.stubGlobal('localStorage', makeStorage());
    let token;
    function Getter() {
      const { getToken } = useAuth();
      token = getToken();
      return null;
    }
    render(<AuthProvider><Getter /></AuthProvider>);
    await waitFor(() => expect(token).toBeNull());
  });

  it('returns stored token', async () => {
    vi.stubGlobal('localStorage', makeStorage({ hirematex_auth_token: 'abc123' }));
    let token;
    function Getter() {
      const { getToken } = useAuth();
      token = getToken();
      return null;
    }
    render(<AuthProvider><Getter /></AuthProvider>);
    await waitFor(() => expect(token).toBe('abc123'));
  });
});

describe('AuthProvider — updateUser', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('updates in-memory user and persists to localStorage', async () => {
    const storage = makeStorage({
      hirematex_auth_token: 'tok',
      hirematex_user: JSON.stringify({ id: 1, email: 'old@test.com', skills: [] }),
    });
    vi.stubGlobal('localStorage', storage);

    let updateFn;
    function Updater() {
      const { updateUser } = useAuth();
      updateFn = updateUser;
      return null;
    }
    render(<AuthProvider><AuthDisplay /><Updater /></AuthProvider>);
    await waitFor(() => screen.getByText('authenticated-old@test.com'));

    act(() => updateFn({ id: 1, email: 'new@test.com', skills: [] }));
    await waitFor(() => screen.getByText('authenticated-new@test.com'));

    expect(storage.setItem).toHaveBeenCalledWith(
      'hirematex_user',
      expect.stringContaining('new@test.com')
    );
  });
});

describe('AuthProvider — logout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('clears user and marks unauthenticated', async () => {
    const storage = makeStorage({
      hirematex_auth_token: 'tok',
      hirematex_user: JSON.stringify({ id: 1, email: 'u@test.com', skills: [] }),
    });
    vi.stubGlobal('localStorage', storage);
    // Stub only location.href using defineProperty to avoid breaking React internals
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    let logoutFn;
    function LogoutBtn() {
      const { logout } = useAuth();
      logoutFn = logout;
      return null;
    }
    render(<AuthProvider><AuthDisplay /><LogoutBtn /></AuthProvider>);
    await waitFor(() => screen.getByText('authenticated-u@test.com'));

    act(() => logoutFn(false)); // false = no redirect
    await waitFor(() => screen.getByText('not-authenticated'));

    expect(storage.removeItem).toHaveBeenCalledWith('hirematex_auth_token');
    expect(storage.removeItem).toHaveBeenCalledWith('hirematex_user');
  });
});
