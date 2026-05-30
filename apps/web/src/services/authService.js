import api from './api.js';

const AUTH_APP_CODE = import.meta.env.VITE_SKYWEB_AUTH_APP_CODE || 'SKYWEB';

async function login({ email, password }) {
  const result = await api.post(
    '/auth/login',
    {
      email,
      password,
      appCode: AUTH_APP_CODE,
    },
    { skipAuth: true },
  );

  api.setSessionToken(result.sessionToken);

  return result;
}

async function logout() {
  try {
    await api.post('/auth/logout', {});
  } finally {
    api.clearSessionToken();
  }
}

async function getCurrentSession() {
  return api.get('/auth/me');
}

async function getProfile() {
  return api.get('/skyweb/profile');
}

async function updateProfile(payload) {
  return api.patch('/skyweb/profile', payload);
}

async function getPreferences() {
  return api.get('/skyweb/preferences');
}

async function updatePreferences(payload) {
  return api.patch('/skyweb/preferences', payload);
}

async function listSavedViews() {
  return api.get('/skyweb/saved-views');
}

async function saveSavedView(payload) {
  return api.post('/skyweb/saved-views', payload);
}

async function updateSavedView(viewKey, payload) {
  return api.patch(`/skyweb/saved-views/${encodeURIComponent(viewKey)}`, payload);
}

async function removeSavedView(viewKey) {
  return api.delete(`/skyweb/saved-views/${encodeURIComponent(viewKey)}`);
}

const authService = {
  getCurrentSession,
  getPreferences,
  getProfile,
  listSavedViews,
  login,
  logout,
  removeSavedView,
  saveSavedView,
  updatePreferences,
  updateProfile,
  updateSavedView,
};

export default authService;
