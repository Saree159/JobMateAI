/**
 * HireMatrix Backend API Client
 * 
 * Provides a clean interface for the frontend to interact with the FastAPI backend.
 * Handles API calls for users, jobs, match scoring, and AI-powered features.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic API request handler with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem('hirematex_auth_token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('hirematex_auth_token');
        localStorage.removeItem('hirematex_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ============================================================================
// USER API
// ============================================================================

export const userApi = {
  /**
   * Create a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user
   */
  create: async (userData) => {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User object
   */
  getById: async (userId) => {
    return apiRequest(`/api/users/${userId}`);
  },

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  update: async (userId, updates) => {
    return apiRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete user account
   * @param {number} userId - User ID
   * @returns {Promise<null>}
   */
  delete: async (userId) => {
    return apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Login user (simple auth)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Token object
   */
  login: async (email, password) => {
    return apiRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// ============================================================================
// JOB API
// ============================================================================

export const jobApi = {
  /**
   * Create a new job for a user
   * @param {number} userId - User ID
   * @param {Object} jobData - Job details
   * @returns {Promise<Object>} Created job
   */
  create: async (userId, jobData) => {
    return apiRequest(`/api/users/${userId}/jobs`, {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  },

  /**
   * List all jobs for a user
   * @param {number} userId - User ID
   * @param {string} [status] - Optional status filter
   * @returns {Promise<Array>} List of jobs
   */
  listByUser: async (userId, status = null) => {
    const queryParams = status ? `?status=${status}` : '';
    return apiRequest(`/api/users/${userId}/jobs${queryParams}`);
  },

  /**
   * Get a single job by ID
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Job object
   */
  getById: async (jobId) => {
    return apiRequest(`/api/jobs/${jobId}`);
  },

  /**
   * Update a job
   * @param {number} jobId - Job ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated job
   */
  update: async (jobId, updates) => {
    return apiRequest(`/api/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a job
   * @param {number} jobId - Job ID
   * @returns {Promise<null>}
   */
  delete: async (jobId) => {
    return apiRequest(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Calculate match score for a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Match score response with matched/missing skills
   */
  calculateMatchScore: async (jobId) => {
    return apiRequest(`/api/jobs/${jobId}/match`, {
      method: 'POST',
    });
  },

  /**
   * Generate AI cover letter for a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Cover letter response
   */
  generateCoverLetter: async (jobId) => {
    return apiRequest(`/api/jobs/${jobId}/cover-letter`, {
      method: 'POST',
    });
  },

  /**
   * Get top 10 Israeli jobs matching the user's profile
   * @param {number} userId - User ID
   * @returns {Promise<Object>} { jobs, user_skills, category, total_scraped }
   */
  topMatches: async (userId, forceRefresh = false) => {
    const url = `/api/jobs/top-matches?user_id=${userId}${forceRefresh ? '&force_refresh=true' : ''}`;
    return apiRequest(url);
  },
};

// ============================================================================
// RESUME API
// ============================================================================

export const jobsApi = {
  /**
   * Fetch the full description from a Drushim job detail page.
   * @param {string} url - The job detail URL (e.g. https://www.drushim.co.il/job/123/)
   * @returns {Promise<{description: string}>}
   */
  fetchDescription: (url, userId) => {
    const params = new URLSearchParams({ url });
    if (userId) params.set("user_id", userId);
    return apiRequest(`/api/jobs/description?${params}`);
  },
};

export const resumeApi = {
  /**
   * Upload and parse a resume file (PDF or DOCX)
   * @param {File} file - Resume file
   * @param {string} token - JWT auth token
   * @returns {Promise<Object>} Parsed resume data with extracted skills
   */
  upload: async (file, token) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    await checkFetchResponse(response);
    return await response.json();
  },

  /**
   * Rewrite a resume tailored to a job description, returns a .docx Blob
   * @param {File} file - Original resume (PDF or DOCX)
   * @param {string} jobDescription - Job description text
   * @param {string} token - JWT auth token
   * @returns {Promise<Blob>} Rewritten resume as .docx blob
   */
  rewrite: async (file, jobDescription, token) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);

    const response = await fetch(`${API_BASE_URL}/api/resume/rewrite`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    await checkFetchResponse(response);
    return await response.blob();
  },

  /**
   * Rewrite resume for a job and return a git-style diff + base64 docx
   * @param {File} file - Original resume (PDF or DOCX)
   * @param {string} jobDescription - Job description text
   * @param {string} token - JWT auth token
   * @param {string} [extraContext] - Optional Q&A answers from gap analysis
   * @returns {Promise<{diff: Array, docx_b64: string}>}
   */
  rewriteDiff: async (file, jobDescription, token, extraContext = "") => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);
    if (extraContext) formData.append('extra_context', extraContext);

    const response = await fetch(`${API_BASE_URL}/api/resume/rewrite-diff`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    await checkFetchResponse(response);
    return await response.json();
  },

  /**
   * Analyze gaps between the resume and the job description.
   * @param {File} file - Original resume (PDF or DOCX)
   * @param {string} jobDescription - Job description text
   * @param {string} token - JWT auth token
   * @returns {Promise<{summary: string, gaps: Array<{requirement: string, question: string}>}>}
   */
  analyzeGaps: async (file, jobDescription, token) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);

    const response = await fetch(`${API_BASE_URL}/api/resume/analyze-gaps`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    await checkFetchResponse(response);
    return await response.json();
  },

  /** Fetch the user's saved resume as a File object (for use in API calls). */
  getSavedFile: async (token, filename) => {
    const response = await fetch(`${API_BASE_URL}/api/resume/saved`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    await checkFetchResponse(response);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  },
};

// ============================================================================
// AUTH HELPERS
// ============================================================================

/** Clear stored session and redirect to /login. Called on any 401 response. */
function handleSessionExpired() {
  localStorage.removeItem('hirematex_auth_token');
  localStorage.removeItem('hirematex_user');
  window.location.href = '/login';
}

async function checkFetchResponse(response) {
  if (!response.ok) {
    if (response.status === 401) {
      handleSessionExpired();
      throw new Error('Session expired. Please log in again.');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check API health
 * @returns {Promise<Object>} Health status
 */
export async function checkApiHealth() {
  return apiRequest('/health');
}

/**
 * Get API root info
 * @returns {Promise<Object>} API info
 */
export async function getApiInfo() {
  return apiRequest('/');
}

// ============================================================================
// BILLING API
// ============================================================================

export const billingApi = {
  /**
   * Create a PayPal subscription and return the approval URL.
   * @param {'monthly'|'annual'} plan
   * @returns {Promise<{url: string, subscription_id: string, plan: string}>}
   */
  getCheckoutUrl: (plan) =>
    apiRequest(`/api/billing/checkout-url?plan=${plan}`),

  /**
   * Verify a PayPal subscription after the user returns from PayPal.
   * @param {string} subscriptionId
   * @returns {Promise<{message: string, subscription_tier: string}>}
   */
  verifySubscription: (subscriptionId) =>
    apiRequest(`/api/billing/verify?subscription_id=${encodeURIComponent(subscriptionId)}`, { method: 'POST' }),

  /**
   * Cancel the current user's Pro subscription.
   * @returns {Promise<{message: string}>}
   */
  cancelSubscription: () =>
    apiRequest('/api/billing/cancel', { method: 'POST' }),
};

export const analyticsApi = {
  getDashboard: () => apiRequest('/api/analytics/dashboard'),
  getInsights:  () => apiRequest('/api/analytics/insights'),
};

// Default export with all APIs
export default {
  user: userApi,
  job: jobApi,
  billing: billingApi,
  checkHealth: checkApiHealth,
  getInfo: getApiInfo,
};
