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

const authService = {
  getCurrentSession,
  getPreferences,
  getProfile,
  login,
  logout,
  updatePreferences,
  updateProfile,
};

export default authService;
