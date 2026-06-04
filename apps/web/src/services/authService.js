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

async function listDashboards() {
  return api.get('/skyweb/dashboards');
}

async function createDashboard(payload) {
  return api.post('/skyweb/dashboards', payload);
}

async function getDashboard(dashboardKey) {
  return api.get(`/skyweb/dashboards/${encodeURIComponent(dashboardKey)}`);
}

async function updateDashboard(dashboardKey, payload) {
  return api.patch(`/skyweb/dashboards/${encodeURIComponent(dashboardKey)}`, payload);
}

async function removeDashboard(dashboardKey) {
  return api.delete(`/skyweb/dashboards/${encodeURIComponent(dashboardKey)}`);
}

async function addDashboardItem(dashboardKey, payload) {
  return api.post(`/skyweb/dashboards/${encodeURIComponent(dashboardKey)}/items`, payload);
}

async function updateDashboardItem(dashboardKey, itemId, payload) {
  return api.patch(
    `/skyweb/dashboards/${encodeURIComponent(dashboardKey)}/items/${encodeURIComponent(itemId)}`,
    payload,
  );
}

async function removeDashboardItem(dashboardKey, itemId) {
  return api.delete(
    `/skyweb/dashboards/${encodeURIComponent(dashboardKey)}/items/${encodeURIComponent(itemId)}`,
  );
}

async function listAlerts(params = {}) {
  return api.get('/skyweb/alerts', { query: params });
}

async function createAlert(payload) {
  return api.post('/skyweb/alerts', payload);
}

async function getAlert(alertKey) {
  return api.get(`/skyweb/alerts/${encodeURIComponent(alertKey)}`);
}

async function listAlertEvents(alertKey, params = {}) {
  return api.get(`/skyweb/alerts/${encodeURIComponent(alertKey)}/events`, { query: params });
}

async function updateAlert(alertKey, payload) {
  return api.patch(`/skyweb/alerts/${encodeURIComponent(alertKey)}`, payload);
}

async function removeAlert(alertKey) {
  return api.delete(`/skyweb/alerts/${encodeURIComponent(alertKey)}`);
}

async function evaluateAlert(alertKey) {
  return api.post(`/skyweb/alerts/${encodeURIComponent(alertKey)}/evaluate`, {});
}

async function evaluateAlerts(payload = {}) {
  return api.post('/skyweb/alerts/evaluate', payload);
}

const authService = {
  createAlert,
  evaluateAlert,
  evaluateAlerts,
  getAlert,
  listAlertEvents,
  listAlerts,
  removeAlert,
  updateAlert,
  updateDashboardItem,
  updateDashboard,
  removeDashboardItem,
  removeDashboard,
  listDashboards,
  getDashboard,
  createDashboard,
  addDashboardItem,
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
