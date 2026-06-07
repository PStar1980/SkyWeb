import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService.js';
import { useAuth } from './AuthContext.jsx';

export const DEFAULT_SKYWEB_PREFERENCES = Object.freeze({
  defaultMacroRegion: 'ALL',
  defaultMacroCategory: 'ALL',
  defaultChartWindow: '3Y',
  dashboardDensity: 'comfortable',
  preferredLandingPage: '/macro',
});

const ALLOWED_PREFERENCE_VALUES = Object.freeze({
  defaultMacroRegion: ['ALL', 'US', 'CA', 'US_CA'],
  defaultMacroCategory: [
    'ALL',
    'inflation',
    'rates',
    'growth',
    'labor',
    'credit',
    'housing',
    'trade',
    'liquidity',
    'regime',
    'comparison',
    'rates_fx',
  ],
  defaultChartWindow: ['1Y', '3Y', '5Y', '7Y', '10Y', 'MAX'],
  dashboardDensity: ['comfortable', 'compact', 'roomy'],
  preferredLandingPage: [
    '/',
    '/dashboard',
    '/dashboards',
    '/macro',
    '/macro/views',
    '/macro/indicators',
    '/account',
  ],
});

const PreferencesContext = createContext(null);

function normalizePreferenceValue(fieldName, value) {
  let candidateValue = String(value || '').trim();

  if (fieldName === 'defaultChartWindow') {
    candidateValue = normalizeLegacyChartPeriod(candidateValue);
  }

  if (fieldName === 'preferredLandingPage' && candidateValue === '/saved') {
    return '/macro/views';
  }

  const allowedValues = ALLOWED_PREFERENCE_VALUES[fieldName] || [];

  return allowedValues.includes(candidateValue)
    ? candidateValue
    : DEFAULT_SKYWEB_PREFERENCES[fieldName];
}

export function normalizePreferences(preferences = {}) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};

  return Object.keys(DEFAULT_SKYWEB_PREFERENCES).reduce((normalized, fieldName) => {
    normalized[fieldName] = normalizePreferenceValue(fieldName, source[fieldName]);
    return normalized;
  }, {});
}

function normalizeLegacyChartPeriod(value) {
  const candidateValue = String(value || '').trim();

  if (candidateValue === '30' || candidateValue === '60') {
    return '1Y';
  }

  if (candidateValue === '120') {
    return '3Y';
  }

  if (candidateValue === 'ALL') {
    return 'MAX';
  }

  return candidateValue;
}

export function normalizeChartPeriodPreference(value) {
  return normalizePreferenceValue('defaultChartWindow', normalizeLegacyChartPeriod(value));
}

export function normalizeChartWindowPreference(value) {
  return normalizeChartPeriodPreference(value);
}

export function getDensityClassName(preferences = DEFAULT_SKYWEB_PREFERENCES) {
  const normalizedPreferences = normalizePreferences(preferences);
  return `skyweb-density-${normalizedPreferences.dashboardDensity}`;
}

export function PreferencesProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [preferences, setPreferencesState] = useState(DEFAULT_SKYWEB_PREFERENCES);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferencesError, setPreferencesError] = useState(null);

  const setPreferences = useCallback((nextPreferences = {}) => {
    const normalizedPreferences = normalizePreferences(nextPreferences);
    setPreferencesState(normalizedPreferences);
    return normalizedPreferences;
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_SKYWEB_PREFERENCES);
    setPreferencesError(null);
    setLoadingPreferences(false);
    return DEFAULT_SKYWEB_PREFERENCES;
  }, []);

  const refreshPreferences = useCallback(async () => {
    if (authLoading) {
      return null;
    }

    if (!isAuthenticated) {
      return resetPreferences();
    }

    setLoadingPreferences(true);
    setPreferencesError(null);

    try {
      const result = await authService.getPreferences();
      return setPreferences(result.preferences || DEFAULT_SKYWEB_PREFERENCES);
    } catch (error) {
      setPreferencesError(error);
      return null;
    } finally {
      setLoadingPreferences(false);
    }
  }, [authLoading, isAuthenticated, resetPreferences, setPreferences]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        resetPreferences();
        return;
      }

      setLoadingPreferences(true);
      setPreferencesError(null);

      try {
        const result = await authService.getPreferences();

        if (!active) {
          return;
        }

        setPreferences(result.preferences || DEFAULT_SKYWEB_PREFERENCES);
      } catch (error) {
        if (active) {
          setPreferencesError(error);
        }
      } finally {
        if (active) {
          setLoadingPreferences(false);
        }
      }
    }

    loadPreferences();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, resetPreferences, setPreferences]);

  const value = useMemo(
    () => ({
      preferences,
      loadingPreferences,
      preferencesError,
      refreshPreferences,
      resetPreferences,
      setPreferences,
    }),
    [
      preferences,
      loadingPreferences,
      preferencesError,
      refreshPreferences,
      resetPreferences,
      setPreferences,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);

  if (!value) {
    throw new Error('usePreferences must be used inside PreferencesProvider.');
  }

  return value;
}
