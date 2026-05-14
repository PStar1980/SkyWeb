const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

const LARGE_NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  notation: 'compact',
});

const KNOWN_ACRONYMS = new Set(['BOC', 'CAD', 'CPI', 'FX', 'GDP', 'PCE', 'US', 'USD', 'YOY']);

export function isDateKey(key = '') {
  return String(key).toLowerCase().includes('date');
}

export function parseDateOnly(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = parseDateOnly(value) || new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return DATE_FORMATTER.format(date);
}

export function isNumericLike(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return false;
  }

  return /^-?\d+(\.\d+)?$/.test(trimmedValue);
}

export function formatNumber(value, options = {}) {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return value === null || value === undefined ? '—' : String(value);
  }

  if (options.compact || Math.abs(numberValue) >= 1000000) {
    return LARGE_NUMBER_FORMATTER.format(numberValue);
  }

  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString()
    : NUMBER_FORMATTER.format(numberValue);
}

export function formatValue(value, key = '') {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (isDateKey(key)) {
    return formatDate(value);
  }

  if (isNumericLike(value)) {
    return formatNumber(value);
  }

  return String(value);
}

export function formatColumnLabel(value = '') {
  const text = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  return text
    .split(' ')
    .map((word) => {
      const upperWord = word.toUpperCase();

      if (KNOWN_ACRONYMS.has(upperWord)) {
        return upperWord;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatRegion(region = '') {
  const normalized = String(region || '').toUpperCase();

  if (normalized === 'US') {
    return 'United States';
  }

  if (normalized === 'CA') {
    return 'Canada';
  }

  if (normalized === 'US_CA') {
    return 'U.S. / Canada';
  }

  return formatColumnLabel(region || 'Other');
}

export function formatCategory(category = '') {
  return formatColumnLabel(category || 'Macro');
}

export function getMaxDate(values = []) {
  const dates = values
    .map((value) => parseDateOnly(value) || new Date(value))
    .filter((date) => date && !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());

  return dates[0] || null;
}
