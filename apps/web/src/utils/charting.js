import { formatColumnLabel, formatDate, isDateKey, isNumericLike } from './formatters.js';

const IGNORED_SERIES_KEYS = new Set(['createdAt', 'updatedAt']);

const PREFERRED_KEY_PATTERNS = [
  { pattern: /yoy/i, score: 120 },
  { pattern: /spread|divergence|premium|discount/i, score: 110 },
  { pattern: /rate|yield|funds|overnight/i, score: 100 },
  { pattern: /change|momentum|acceleration/i, score: 90 },
  { pattern: /index|condition|regime|value/i, score: 80 },
  { pattern: /gdp|cpi|pce|employment|labor|housing|trade|fx|cad|usd/i, score: 70 },
];

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

export function getRowValue(row = {}, key) {
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
  const columnKeys = getColumnKeys(columns);
  const candidateKeys = columnKeys.length > 0 ? columnKeys : Object.keys(rows[0] || {});

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
      minPoint: null,
      maxPoint: null,
      change: null,
      percentChange: null,
      direction: 'flat',
    };
  }

  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const change = previous ? latest.value - previous.value : null;
  const percentChange = previous && previous.value !== 0 ? change / Math.abs(previous.value) : null;
  const sortedByValue = [...series].sort((left, right) => left.value - right.value);
  const minPoint = sortedByValue[0];
  const maxPoint = sortedByValue[sortedByValue.length - 1];

  return {
    count: series.length,
    latest,
    previous,
    min: minPoint?.value ?? null,
    max: maxPoint?.value ?? null,
    minPoint,
    maxPoint,
    change,
    percentChange,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

export function getSeriesLabel(key) {
  return formatColumnLabel(key);
}

export function scoreSeriesKey(key = '') {
  const normalizedKey = String(key);
  const patternScore =
    PREFERRED_KEY_PATTERNS.find(({ pattern }) => pattern.test(normalizedKey))?.score || 10;
  const penalty = /id|rank|sort|order/i.test(normalizedKey) ? 50 : 0;

  return patternScore - penalty;
}

export function getPreferredSeriesKey(keys = []) {
  return [...keys].sort((left, right) => scoreSeriesKey(right) - scoreSeriesKey(left))[0] || '';
}

export function getSeriesCatalog(rows = [], columns = []) {
  return getNumericSeriesKeys(rows, columns)
    .map((key) => {
      const series = buildSeries(rows, key);
      const summary = summarizeSeries(series);

      return {
        key,
        label: getSeriesLabel(key),
        score: scoreSeriesKey(key),
        series,
        summary,
      };
    })
    .filter((item) => item.summary.count > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.summary.count - left.summary.count;
    });
}

export function getDateRangeFromRows(rows = []) {
  const dates = rows
    .map((row) => getDateValue(row))
    .map((value) => (value ? new Date(value) : null))
    .filter((date) => date && !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return {
    minDate: dates[0] || null,
    maxDate: dates[dates.length - 1] || null,
  };
}
