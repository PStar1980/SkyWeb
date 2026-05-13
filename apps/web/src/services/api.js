import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_SKYSERVER_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000),
});

function normalizeError(error) {
  const response = error?.response;
  const message =
    response?.data?.error || response?.data?.message || error?.message || 'SkyWeb request failed.';

  const normalized = new Error(message);
  normalized.status = response?.status || null;
  normalized.details = response?.data?.details || response?.data || null;
  normalized.originalError = error;
  return normalized;
}

async function get(path, options = {}) {
  try {
    const response = await api.get(path, {
      params: options.query || options.params || undefined,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

async function post(path, body = {}, options = {}) {
  try {
    const response = await api.post(path, body, options);
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export default {
  get,
  post,
};
