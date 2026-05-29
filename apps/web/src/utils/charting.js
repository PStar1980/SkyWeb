import { formatColumnLabel, formatDate, isDateKey, isNumericLike } from './formatters.js';

const IGNORED_SERIES_KEYS = new Set(['createdAt', 'updatedAt']);

function getDateValue(row = {}) {
  return row.date || row.edate || row.asOfDate || row.periodDate || row.observationDate || null;
}

function getColumnKeys(columns = []) {
  return columns
    .map((column) => {
      if (typeof column === 'string') {
        return column;
      }

      return column.fieldName || column.name || column.columnName;
    })
    .filter(Boolean);
}

function getRowValue(row = {}, key) {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key];
  }

  const snakeKey = String(key).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  if (Object.prototype.hasOwnProperty.call(row, snakeKey)) {
    return row[snakeKey];
  }

  return null;
}

export function getNumericSeriesKeys(rows = [], columns = []) {
  const candidateKeys =
    getColumnKeys(columns).length > 0 ? getColumnKeys(columns) : Object.keys(rows[0] || {});

  return candidateKeys.filter((key) => {
    if (!key || IGNORED_SERIES_KEYS.has(key) || isDateKey(key)) {
      return false;
    }

    return rows.some((row) => isNumericLike(getRowValue(row, key)));
  });
}

export function buildSeries(rows = [], key) {
  return rows
    .map((row, index) => {
      const rawValue = getRowValue(row, key);
      const numericValue = Number(rawValue);
      const dateValue = getDateValue(row);

      if (!Number.isFinite(numericValue)) {
        return null;
      }

      return {
        index,
        date: dateValue,
        label: dateValue ? formatDate(dateValue) : `Point ${index + 1}`,
        value: numericValue,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : left.index;
      const rightTime = right.date ? new Date(right.date).getTime() : right.index;

      return leftTime - rightTime;
    });
}

export function summarizeSeries(series = []) {
  if (!series.length) {
    return {
      count: 0,
      latest: null,
      previous: null,
      min: null,
      max: null,
      change: null,
      direction: 'flat',
    };
  }

  const values = series.map((point) => point.value);
  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const change = previous ? latest.value - previous.value : null;

  return {
    count: series.length,
    latest,
    previous,
    min: Math.min(...values),
    max: Math.max(...values),
    change,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

export function getSeriesLabel(key) {
  return formatColumnLabel(key);
}
