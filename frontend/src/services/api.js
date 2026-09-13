/**
 * API Client helper using fetch with credentials: 'include'
 * to automatically attach HttpOnly session cookies.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
    },
  };

  // Automatically handle JSON stringify if body is object and not FormData
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    // Session unauthenticated or expired
    const isAuthEndpoint = endpoint.startsWith('/auth/');
    if (!isAuthEndpoint) {
      // Trigger session refresh or redirection if needed
    }
  }

  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } else {
        const text = await response.text();
        errorMessage = text || errorMessage;
      }
    } catch (e) {
      // Ignore JSON parse errors for non-200 responses
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return response;
}

export const api = {
  get: (endpoint, headers = {}) => request(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers = {}) => request(endpoint, { method: 'POST', body, headers }),
  patch: (endpoint, body, headers = {}) => request(endpoint, { method: 'PATCH', body, headers }),
  delete: (endpoint, headers = {}) => request(endpoint, { method: 'DELETE', headers }),
};
