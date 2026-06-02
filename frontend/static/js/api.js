/**
 * VidSnap AI - Centralized API Communication Module
 * 
 * All backend API calls happen through this file.
 * Every other JS file imports functions from here.
 * 
 * Change API_BASE to production URL when deploying.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Backend API base URL.
 * In production, window.VIDSNAP_API_BASE is injected by base.html
 * from the BACKEND_URL environment variable set on the Flask server.
 * Falls back to localhost for local development with no config needed.
 */
const API_BASE = window.VIDSNAP_API_BASE || 'http://localhost:8000';


// LocalStorage keys
const TOKEN_KEY = 'vidsnap_token';
const NAME_KEY = 'vidsnap_name';
const EMAIL_KEY = 'vidsnap_email';
const TOKENS_KEY = 'vidsnap_tokens';

// ============================================================================
// PRIVATE HELPER FUNCTIONS
// ============================================================================

/**
 * Get JWT token from localStorage.
 * @returns {string | null} JWT token or null if not found
 */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Build Authorization header object from saved JWT token.
 * Returns object with Content-Type only if no token — for public routes.
 * @returns {Object} Headers object with Authorization if token exists
 */
function getAuthHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Save JWT token and user info to localStorage after login/signup.
 * @param {Object} responseData - Response from login or signup endpoint
 * @param {string} responseData.access_token - JWT token
 * @param {string} responseData.name - User's name
 * @param {string} responseData.email - User's email
 * @param {number} responseData.tokens_remaining - Remaining generation tokens
 */
function saveAuthData(responseData) {
  localStorage.setItem(TOKEN_KEY, responseData.access_token);
  localStorage.setItem(NAME_KEY, responseData.name);
  localStorage.setItem(EMAIL_KEY, responseData.email);
  localStorage.setItem(TOKENS_KEY, String(responseData.tokens_remaining));
}

/**
 * Remove all auth data from localStorage on logout.
 */
function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(TOKENS_KEY);
}

/**
 * Handle API response errors.
 * Parse JSON error details from response.
 * @param {Response} response - Fetch response object
 * @param {string} fallbackMessage - Fallback message if parsing fails
 * @throws {Error} Error with detail from API or fallback message
 */
async function handleApiError(response, fallbackMessage) {
  try {
    const errorData = await response.json();
    throw new Error(errorData.detail || fallbackMessage);
  } catch (parseError) {
    throw new Error(fallbackMessage);
  }
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Register a new user account.
 * Saves token and user info to localStorage on success.
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 8 chars)
 * @returns {Promise<Object>} {access_token, name, email, tokens_remaining}
 * @throws {Error} if email exists or validation fails
 */
async function signup(name, email, password) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  if (!response.ok) {
    await handleApiError(response, 'Signup failed');
  }

  const responseData = await response.json();
  saveAuthData(responseData);
  return responseData;
}

/**
 * Authenticate user and save token to localStorage.
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} {access_token, name, email, tokens_remaining}
 * @throws {Error} if credentials invalid or request fails
 */
async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    await handleApiError(response, 'Login failed');
  }

  const responseData = await response.json();
  saveAuthData(responseData);
  return responseData;
}

/**
 * Clear all auth data and redirect to login page.
 */
function logout() {
  clearAuthData();
  window.location.href = '/login';
}

/**
 * Check if a JWT token exists in localStorage.
 * Does not verify if token is still valid.
 * @returns {boolean} True if token found
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Get saved user info from localStorage.
 * @returns {Object|null} {name, email, tokens_remaining} or null if not logged in
 */
function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  const tokensString = localStorage.getItem(TOKENS_KEY) || '0';
  return {
    name: localStorage.getItem(NAME_KEY),
    email: localStorage.getItem(EMAIL_KEY),
    tokens_remaining: parseInt(tokensString, 10)
  };
}

/**
 * Send OTP to email for password reset.
 * @param {string} email - User's email address
 * @returns {Promise<Object>} {message: string}
 * @throws {Error} if request fails
 */
async function forgotPassword(email) {
  const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    await handleApiError(response, 'Password reset request failed');
  }

  return await response.json();
}

/**
 * Complete password reset with OTP.
 * @param {string} email - User's email address
 * @param {string} otp - One-time password sent to email
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} {message: string}
 * @throws {Error} if OTP invalid, expired, or request fails
 */
async function resetPassword(email, otp, newPassword) {
  const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password: newPassword })
  });

  if (!response.ok) {
    await handleApiError(response, 'Password reset failed');
  }

  return await response.json();
}

/**
 * Get current user profile from API.
 * @returns {Promise<Object>} {name, email, tokens_remaining, created_at, ...}
 * @throws {Error} if not authenticated or request fails
 */
async function getProfile() {
  const response = await fetch(`${API_BASE}/api/users/me`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch profile');
  }

  return await response.json();
}

/**
 * Submit a new reel generation job.
 * 
 * IMPORTANT: Do NOT set Content-Type header — browser automatically sets it
 * with multipart boundary for FormData.
 * 
 * @param {FormData} formData - Must have 'voiceover_text' and 'images' fields
 * @returns {Promise<Object>} {job_id, status, message}
 * @throws {Error} if validation fails, no tokens remaining, or request fails
 */
async function createJob(formData) {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Build headers WITHOUT Content-Type — let browser set it for multipart
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: headers,
    body: formData
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to create job');
  }

  return await response.json();
}

/**
 * Poll job status. Called every 3 seconds after job creation.
 * @param {string} jobId - UUID from createJob response
 * @returns {Promise<Object>} {job_id, status, reel_url, error_msg, created_at, updated_at}
 * @throws {Error} if job not found or request fails
 */
async function getJobStatus(jobId) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch job status');
  }

  return await response.json();
}

/**
 * Get all completed reels for current user.
 * @returns {Promise<Array>} Array of {job_id, reel_url, created_at, status, ...}
 * @throws {Error} if not authenticated or request fails
 */
async function getAllReels() {
  const response = await fetch(`${API_BASE}/api/reels`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch reels');
  }

  return await response.json();
}

/**
 * Delete a reel from Cloudinary and MongoDB.
 * @param {string} jobId - UUID of reel to delete
 * @returns {Promise<Object>} {deleted: boolean, job_id: string}
 * @throws {Error} if not found, unauthorized, or request fails
 */
async function deleteReel(jobId) {
  const response = await fetch(`${API_BASE}/api/reels/${jobId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to delete reel');
  }

  return await response.json();
}

/**
 * Submit user feedback.
 * @param {string} message - Feedback message (min 10 characters)
 * @param {number} rating - Optional rating (1-5 stars)
 * @returns {Promise<Object>} {submitted: boolean, message: string}
 * @throws {Error} if not authenticated or validation fails
 */
async function submitFeedback(message, rating = null) {
  const body = { message };
  if (rating) {
    body.rating = rating;
  }

  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to submit feedback');
  }

  return await response.json();
}

/**
 * Get platform stats — admin only.
 * @returns {Promise<Object>} {total_users, total_reels, total_feedback, reels_today, ...}
 * @throws {Error} if not authenticated, not admin, or request fails
 */
async function getAdminStats() {
  const response = await fetch(`${API_BASE}/api/admin/stats`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch admin stats');
  }

  return await response.json();
}

/**
 * Get list of all users — admin only.
 * @returns {Promise<Array>} Array of user objects
 * @throws {Error} if not authenticated, not admin, or request fails
 */
async function getAdminUsers() {
  const response = await fetch(`${API_BASE}/api/admin/users`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch users');
  }

  return await response.json();
}

/**
 * Update user token balance — admin only.
 * @param {string} userId - User's MongoDB ID
 * @param {number} tokens - New token count
 * @returns {Promise<Object>} Updated user object
 * @throws {Error} if not authenticated, not admin, or request fails
 */
async function updateUserTokens(userId, tokens) {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}/tokens`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tokens })
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to update user tokens');
  }

  return await response.json();
}

/**
 * Get all reels — admin only.
 * @returns {Promise<Array>} Array of all reel objects
 * @throws {Error} if not authenticated, not admin, or request fails
 */
async function getAdminReels() {
  const response = await fetch(`${API_BASE}/api/admin/reels`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch reels');
  }

  return await response.json();
}

/**
 * Get all feedback — admin only.
 * @returns {Promise<Array>} Array of all feedback objects
 * @throws {Error} if not authenticated, not admin, or request fails
 */
async function getAdminFeedback() {
  const response = await fetch(`${API_BASE}/api/admin/feedback`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch feedback');
  }

  return await response.json();
}
