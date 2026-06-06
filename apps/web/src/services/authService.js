import { notifyAlertSignalsChanged } from '../utils/alertSignals.js';
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

async function getAlertPreferences() {
  return api.get('/skyweb/alert-preferences');
}

async function updateAlertPreferences(payload) {
  return api.patch('/skyweb/alert-preferences', payload);
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
  const result = await api.post(`/skyweb/alerts/${encodeURIComponent(alertKey)}/evaluate`, {});
  notifyAlertSignalsChanged();
  return result;
}

async function evaluateAlerts(payload = {}) {
  const result = await api.post('/skyweb/alerts/evaluate', payload);
  notifyAlertSignalsChanged();
  return result;
}

async function listAlertNotifications(params = {}) {
  return api.get('/skyweb/alert-notifications', { query: params });
}

async function acknowledgeAlertNotification(notificationId) {
  const result = await api.patch(
    `/skyweb/alert-notifications/${encodeURIComponent(notificationId)}/acknowledge`,
    {},
  );
  notifyAlertSignalsChanged();
  return result;
}

async function dismissAlertNotification(notificationId) {
  const result = await api.patch(
    `/skyweb/alert-notifications/${encodeURIComponent(notificationId)}/dismiss`,
    {},
  );
  notifyAlertSignalsChanged();
  return result;
}

async function acknowledgeAllAlertNotifications(payload = {}) {
  const result = await api.post('/skyweb/alert-notifications/acknowledge-all', payload);
  notifyAlertSignalsChanged();
  return result;
}

async function dismissAllAlertNotifications(payload = {}) {
  const result = await api.post('/skyweb/alert-notifications/dismiss-all', payload);
  notifyAlertSignalsChanged();
  return result;
}

const authService = {
  acknowledgeAllAlertNotifications,
  acknowledgeAlertNotification,
  createAlert,
  evaluateAlert,
  evaluateAlerts,
  getAlert,
  getAlertPreferences,
  dismissAlertNotification,
  dismissAllAlertNotifications,
  listAlertEvents,
  listAlertNotifications,
  listAlerts,
  removeAlert,
  updateAlert,
  updateAlertPreferences,
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
