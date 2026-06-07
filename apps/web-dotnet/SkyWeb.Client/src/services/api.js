import axios from 'axios';

const SESSION_TOKEN_KEY = import.meta.env.VITE_SKYWEB_SESSION_TOKEN_KEY || 'skyweb.sessionToken';
const AUTH_EXPIRED_EVENT = 'skyweb:auth-expired';

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_SKYWEB_API_BASE_URL ||
    import.meta.env.VITE_SKYSERVER_API_BASE_URL ||
    '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000),
});

function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

function setSessionToken(token) {
  if (!token) {
    clearSessionToken();
    return;
  }

  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

function notifyAuthExpired(
  message = 'Your SkyWeb Analytics session expired. Please sign in again.',
) {
  clearSessionToken();

  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: {
        message,
      },
    }),
  );
}

function normalizeError(error) {
  const response = error?.response;
  const message =
    response?.data?.error ||
    response?.data?.message ||
    error?.message ||
    'SkyWeb Analytics request failed.';

  const normalized = new Error(message);
  normalized.status = response?.status || null;
  normalized.details = response?.data?.details || response?.data || null;
  normalized.originalError = error;
  return normalized;
}

apiClient.interceptors.request.use((config) => {
  if (config.skipAuth) {
    return config;
  }

  const token = getSessionToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.skipAuth) {
      notifyAuthExpired(error.response?.data?.error || 'Your SkyWeb Analytics session expired.');
    }

    return Promise.reject(error);
  },
);

async function get(path, options = {}) {
  try {
    const response = await apiClient.get(path, {
      params: options.query || options.params || undefined,
      skipAuth: options.skipAuth || false,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function post(path, body = {}, options = {}) {
  try {
    const response = await apiClient.post(path, body, {
      ...options,
      skipAuth: options.skipAuth || false,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function patch(path, body = {}, options = {}) {
  try {
    const response = await apiClient.patch(path, body, {
      ...options,
      skipAuth: options.skipAuth || false,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function put(path, body = {}, options = {}) {
  try {
    const response = await apiClient.put(path, body, {
      ...options,
      skipAuth: options.skipAuth || false,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function remove(path, options = {}) {
  try {
    const response = await apiClient.delete(path, {
      params: options.query || options.params || undefined,
      skipAuth: options.skipAuth || false,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export default {
  AUTH_EXPIRED_EVENT,
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  notifyAuthExpired,
  get,
  post,
  patch,
  put,
  delete: remove,
};
