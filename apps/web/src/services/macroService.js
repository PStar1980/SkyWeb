import api from './api.js';

const macroPrefix = import.meta.env.VITE_MACRO_API_PREFIX || '/public/macro';

function buildQuery(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

function getSummary() {
  return api.get(`${macroPrefix}/summary`);
}

function listViews(params = {}) {
  return api.get(`${macroPrefix}/views`, { query: buildQuery(params) });
}

function getViewRows(viewKey, params = {}) {
  return api.get(`${macroPrefix}/views/${encodeURIComponent(viewKey)}`, {
    query: buildQuery(params),
  });
}

function getLatestViewRow(viewKey) {
  return api.get(`${macroPrefix}/views/${encodeURIComponent(viewKey)}/latest`);
}

function getViewColumns(viewKey) {
  return api.get(`${macroPrefix}/views/${encodeURIComponent(viewKey)}/columns`);
}

function listIndicators(params = {}) {
  return api.get(`${macroPrefix}/indicators`, { query: buildQuery(params) });
}

function getIndicatorSeries(indicatorCode, params = {}) {
  return api.get(`${macroPrefix}/indicators/${encodeURIComponent(indicatorCode)}/series`, {
    query: buildQuery(params),
  });
}

export default {
  getSummary,
  listViews,
  getViewRows,
  getLatestViewRow,
  getViewColumns,
  listIndicators,
  getIndicatorSeries,
};
