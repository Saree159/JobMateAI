import { describe, it, expect } from 'vitest';
import { createPageUrl } from '@/utils';

describe('createPageUrl', () => {
  it('lowercases the page name', () => {
    expect(createPageUrl('Dashboard')).toBe('/dashboard');
  });

  it('replaces spaces with hyphens', () => {
    expect(createPageUrl('Israeli Jobs')).toBe('/israeli-jobs');
  });

  it('handles already-lowercase names', () => {
    expect(createPageUrl('login')).toBe('/login');
  });

  it('handles multi-word names', () => {
    expect(createPageUrl('Job Match')).toBe('/job-match');
  });

  it('handles empty string', () => {
    expect(createPageUrl('')).toBe('/');
  });
});
