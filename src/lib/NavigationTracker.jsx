import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { track, analytics } from './analytics';

function inferPage(pathname) {
  if (pathname === '/' || pathname === '') return 'home';
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg || 'unknown';
}

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const pageStartRef = useRef(Date.now());
  const lastPageRef = useRef(null);

  useEffect(() => {
    const currentPage = inferPage(location.pathname);

    // Track time spent on the PREVIOUS page before navigating away
    if (lastPageRef.current && isAuthenticated) {
      const seconds = Math.round((Date.now() - pageStartRef.current) / 1000);
      if (seconds > 0 && seconds < 3600) {
        analytics.pageTime(lastPageRef.current, seconds);
      }
    }

    // Track the new page view
    if (isAuthenticated) {
      track('page_view', {}, currentPage);
    }

    lastPageRef.current = currentPage;
    pageStartRef.current = Date.now();

    // Also post URL change to parent window (for embedded contexts)
    window.parent?.postMessage({ type: 'app_changed_url', url: window.location.href }, '*');
  }, [location, isAuthenticated]);

  return null;
}
