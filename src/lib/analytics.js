/**
 * Lightweight behavior tracker.
 * Fires fire-and-forget POST /api/analytics/event calls.
 * All events are tagged with a per-session ID.
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SESSION_KEY = "hm_session_id";

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

/**
 * Track a user action.
 * @param {string} event  - e.g. "job_click", "page_view"
 * @param {object} props  - extra context (job title, source, match score, …)
 * @param {string} page   - current page name (e.g. "dashboard")
 */
export function track(event, props = {}, page = null) {
  const token = getToken();
  if (!token) return; // don't track unauthenticated users

  const inferredPage = page || inferPage(window.location.pathname);

  fetch(`${API_BASE}/api/analytics/event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      event,
      page: inferredPage,
      properties: props,
      session_id: getSessionId(),
    }),
  }).catch(() => {}); // fire-and-forget, never throw
}

function inferPage(pathname) {
  if (pathname === "/" || pathname === "") return "home";
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg || "unknown";
}

/** Convenience wrappers */
export const analytics = {
  page: (name, props) => track("page_view", props, name),
  jobClick: (job) => track("job_click", { title: job.title, source: job.source, match_score: job.match_score, url: job.url }),
  jobSave: (job) => track("job_save", { title: job.title, source: job.source }),
  jobApply: (job) => track("job_apply", { title: job.title, source: job.source }),
  refreshMatches: () => track("refresh_matches", {}),
  loadMore: (page, remaining) => track("load_more", { remaining }, page),
  filterChange: (filter, value) => track("filter_change", { filter, value }),
  profileUpdate: (fields) => track("profile_update", { fields }),
  resumeUpload: () => track("resume_upload", {}),
  search: (query, results) => track("search", { query, results }),
  pageTime: (page, seconds) => track("page_time", { seconds }, page),
};

/**
 * Track an event without requiring authentication.
 * Used for registration-funnel events fired before the user has a token.
 */
export function trackPublic(event, props = {}, page = null) {
  const inferredPage = page || inferPage(window.location.pathname);
  fetch(`${API_BASE}/api/analytics/public-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      page: inferredPage,
      properties: props,
      session_id: getSessionId(),
    }),
  }).catch(() => {});
}

/** Registration funnel helpers — fire from Register.jsx */
export const regTrack = {
  start: () => trackPublic("registration_start"),
  fieldEmail: (email) => trackPublic("registration_field_email", { email }),
  fieldPassword: () => trackPublic("registration_field_password"),
  submitAttempt: (email) => trackPublic("registration_submit_attempt", { email }),
  complete: (durationSeconds) =>
    trackPublic("registration_complete", { duration_seconds: durationSeconds }),
};
