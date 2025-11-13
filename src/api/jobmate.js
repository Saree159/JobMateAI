/**
 * JobMate AI Backend API Client
 * 
 * Provides a clean interface for the frontend to interact with the FastAPI backend.
 * Handles API calls for users, jobs, match scoring, and cover letter generation.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic API request handler with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
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
};

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

// Default export with all APIs
export default {
  user: userApi,
  job: jobApi,
  checkHealth: checkApiHealth,
  getInfo: getApiInfo,
};
