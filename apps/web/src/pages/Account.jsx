import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  DEFAULT_SKYWEB_PREFERENCES,
  normalizePreferences,
  usePreferences,
} from '../context/PreferencesContext.jsx';
import authService from '../services/authService.js';
import { formatCategory, formatDateTime, formatRegion } from '../utils/formatters.js';

const EMPTY_PROFILE_FORM = {
  displayName: '',
  headline: '',
  bio: '',
  timezone: '',
  locale: '',
  avatarUrl: '',
};

const DEFAULT_PREFERENCES_FORM = DEFAULT_SKYWEB_PREFERENCES;

const PROFILE_FIELD_NAMES = Object.keys(EMPTY_PROFILE_FORM);
const PREFERENCE_FIELD_NAMES = Object.keys(DEFAULT_PREFERENCES_FORM);

const PROFILE_FIELDS = [
  {
    name: 'displayName',
    label: 'Display name',
    placeholder: 'How SkyWeb should display you',
    autoComplete: 'name',
  },
  {
    name: 'headline',
    label: 'Headline',
    placeholder: 'Builder of dashboards, systems, and clean little data empires',
    autoComplete: 'off',
  },
  {
    name: 'timezone',
    label: 'Timezone',
    placeholder: 'America/Toronto',
    autoComplete: 'off',
  },
  {
    name: 'locale',
    label: 'Locale',
    placeholder: 'en-CA',
    autoComplete: 'language',
  },
  {
    name: 'avatarUrl',
    label: 'Avatar URL',
    placeholder: 'https://example.com/avatar.png',
    autoComplete: 'url',
  },
];

const PREFERENCE_FIELDS = [
  {
    name: 'defaultMacroRegion',
    label: 'Default macro region',
    helper: 'Initial regional lens for future personalized dashboard surfaces.',
    options: [
      { value: 'ALL', label: 'All regions' },
      { value: 'US', label: 'United States' },
      { value: 'CA', label: 'Canada' },
      { value: 'US_CA', label: 'U.S. / Canada comparisons' },
    ],
  },
  {
    name: 'defaultMacroCategory',
    label: 'Default macro category',
    helper: 'The first category lane SkyWeb should prioritize for you.',
    options: [
      { value: 'ALL', label: 'All categories' },
      { value: 'inflation', label: 'Inflation' },
      { value: 'rates', label: 'Rates' },
      { value: 'growth', label: 'Growth' },
      { value: 'labor', label: 'Labor' },
      { value: 'credit', label: 'Credit' },
      { value: 'housing', label: 'Housing' },
      { value: 'trade', label: 'Trade' },
      { value: 'liquidity', label: 'Liquidity' },
      { value: 'regime', label: 'Regime' },
      { value: 'comparison', label: 'Comparison' },
      { value: 'rates_fx', label: 'Rates / FX' },
    ],
  },
  {
    name: 'defaultChartWindow',
    label: 'Default chart window',
    helper: 'Saved preference for future chart panels and dashboard presets.',
    options: [
      { value: '30', label: '30 loaded points' },
      { value: '60', label: '60 loaded points' },
      { value: '120', label: '120 loaded points' },
      { value: 'ALL', label: 'All loaded points' },
    ],
  },
  {
    name: 'dashboardDensity',
    label: 'Dashboard density',
    helper: 'Controls how tight future member dashboard cards should feel.',
    options: [
      { value: 'comfortable', label: 'Comfortable' },
      { value: 'compact', label: 'Compact' },
      { value: 'roomy', label: 'Roomy' },
    ],
  },
  {
    name: 'preferredLandingPage',
    label: 'Preferred landing page',
    helper: 'Where future personalized entry points should send you first.',
    options: [
      { value: '/', label: 'Home' },
      { value: '/macro', label: 'Macro dashboard' },
      { value: '/macro/views', label: 'Macro views' },
      { value: '/macro/indicators', label: 'Indicators' },
      { value: '/account', label: 'Account' },
    ],
  },
];

function formatPermissionCount(permissions = []) {
  return `${permissions.length} permission${permissions.length === 1 ? '' : 's'}`;
}

function normalizeFormValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

function getProfileDisplayNameForForm(profile) {
  if (!profile) {
    return '';
  }

  if (Object.prototype.hasOwnProperty.call(profile, 'profileDisplayName')) {
    return profile.profileDisplayName;
  }

  return profile.displayName;
}

function profileToForm(profile) {
  return {
    displayName: normalizeFormValue(getProfileDisplayNameForForm(profile)),
    headline: normalizeFormValue(profile?.headline),
    bio: normalizeFormValue(profile?.bio),
    timezone: normalizeFormValue(profile?.timezone),
    locale: normalizeFormValue(profile?.locale),
    avatarUrl: normalizeFormValue(profile?.avatarUrl),
  };
}

function preferencesToForm(preferences = {}) {
  return PREFERENCE_FIELD_NAMES.reduce(
    (form, fieldName) => ({
      ...form,
      [fieldName]: normalizeFormValue(
        preferences[fieldName] || DEFAULT_PREFERENCES_FORM[fieldName],
      ),
    }),
    {},
  );
}

function formsMatch(left, right, fieldNames) {
  return fieldNames.every((fieldName) => left[fieldName] === right[fieldName]);
}

function buildProfilePayload(form) {
  return PROFILE_FIELD_NAMES.reduce((payload, fieldName) => {
    payload[fieldName] = form[fieldName];
    return payload;
  }, {});
}

function buildPreferencesPayload(form) {
  return PREFERENCE_FIELD_NAMES.reduce((payload, fieldName) => {
    payload[fieldName] = form[fieldName];
    return payload;
  }, {});
}

function getPreferenceLabel(fieldName, value) {
  const field = PREFERENCE_FIELDS.find((preferenceField) => preferenceField.name === fieldName);
  const option = field?.options.find((fieldOption) => fieldOption.value === value);
  return option?.label || value || '—';
}

export default function Account() {
  const { permissions, refreshSession, session, user } = useAuth();
  const { setPreferences: setGlobalPreferences } = usePreferences();
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [initialProfileForm, setInitialProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES_FORM);
  const [preferencesForm, setPreferencesForm] = useState(DEFAULT_PREFERENCES_FORM);
  const [initialPreferencesForm, setInitialPreferencesForm] = useState(DEFAULT_PREFERENCES_FORM);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [error, setError] = useState(null);
  const [profileSaveError, setProfileSaveError] = useState(null);
  const [profileSaveNotice, setProfileSaveNotice] = useState('');
  const [preferencesSaveError, setPreferencesSaveError] = useState(null);
  const [preferencesSaveNotice, setPreferencesSaveNotice] = useState('');

  const permissionCodes = useMemo(
    () => permissions.map((permission) => permission.permissionCode).filter(Boolean),
    [permissions],
  );

  const profileIsDirty = useMemo(
    () => !formsMatch(profileForm, initialProfileForm, PROFILE_FIELD_NAMES),
    [initialProfileForm, profileForm],
  );

  const preferencesAreDirty = useMemo(
    () => !formsMatch(preferencesForm, initialPreferencesForm, PREFERENCE_FIELD_NAMES),
    [initialPreferencesForm, preferencesForm],
  );

  const profileDisplayName =
    profile?.displayName || user?.displayName || user?.username || user?.email || 'SkyWeb member';

  const avatarUrl = profileForm.avatarUrl.trim();
  const avatarInitial = profileDisplayName.trim().charAt(0).toUpperCase() || 'S';
  const preferredLandingPage = preferencesForm.preferredLandingPage || '/macro';

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      setLoadingAccount(true);
      setError(null);
      setProfileSaveError(null);
      setProfileSaveNotice('');
      setPreferencesSaveError(null);
      setPreferencesSaveNotice('');

      try {
        const [profileResult, preferencesResult] = await Promise.all([
          authService.getProfile(),
          authService.getPreferences(),
        ]);

        if (!active) {
          return;
        }

        const nextProfile = profileResult.profile || null;
        const nextProfileForm = profileToForm(nextProfile);
        const nextPreferences = normalizePreferences(
          preferencesResult.preferences || DEFAULT_PREFERENCES_FORM,
        );
        const nextPreferencesForm = preferencesToForm(nextPreferences);

        setProfile(nextProfile);
        setProfileForm(nextProfileForm);
        setInitialProfileForm(nextProfileForm);
        setPreferences(nextPreferences);
        setGlobalPreferences(nextPreferences);
        setPreferencesForm(nextPreferencesForm);
        setInitialPreferencesForm(nextPreferencesForm);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError);
      } finally {
        if (active) {
          setLoadingAccount(false);
        }
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [setGlobalPreferences]);

  function handleProfileInputChange(event) {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setProfileSaveError(null);
    setProfileSaveNotice('');
  }

  function handlePreferencesInputChange(event) {
    const { name, value } = event.target;

    setPreferencesForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setPreferencesSaveError(null);
    setPreferencesSaveNotice('');
  }

  function handleEditProfile() {
    setIsEditingProfile(true);
    setProfileSaveError(null);
    setProfileSaveNotice('');
  }

  function handleEditPreferences() {
    setIsEditingPreferences(true);
    setPreferencesSaveError(null);
    setPreferencesSaveNotice('');
  }

  function handleCancelProfileEdit() {
    setProfileForm(initialProfileForm);
    setIsEditingProfile(false);
    setProfileSaveError(null);
    setProfileSaveNotice('');
  }

  function handleCancelPreferencesEdit() {
    setPreferencesForm(initialPreferencesForm);
    setIsEditingPreferences(false);
    setPreferencesSaveError(null);
    setPreferencesSaveNotice('');
  }

  function handleResetPreferences() {
    setPreferencesForm(DEFAULT_PREFERENCES_FORM);
    setPreferencesSaveError(null);
    setPreferencesSaveNotice('Default dashboard preferences staged. Save to apply them.');
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (!profileIsDirty) {
      setIsEditingProfile(false);
      setProfileSaveNotice('No profile changes to save.');
      return;
    }

    setSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveNotice('');

    try {
      const result = await authService.updateProfile(buildProfilePayload(profileForm));
      const nextProfile = result.profile || null;
      const nextForm = profileToForm(nextProfile);

      setProfile(nextProfile);
      setProfileForm(nextForm);
      setInitialProfileForm(nextForm);
      setIsEditingProfile(false);
      setProfileSaveNotice('Profile saved successfully.');
    } catch (updateError) {
      setProfileSaveError(updateError);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePreferencesSubmit(event) {
    event.preventDefault();

    if (!preferencesAreDirty) {
      setIsEditingPreferences(false);
      setPreferencesSaveNotice('No preference changes to save.');
      return;
    }

    setSavingPreferences(true);
    setPreferencesSaveError(null);
    setPreferencesSaveNotice('');

    try {
      const result = await authService.updatePreferences(buildPreferencesPayload(preferencesForm));
      const nextPreferences = normalizePreferences(result.preferences || DEFAULT_PREFERENCES_FORM);
      const nextForm = preferencesToForm(nextPreferences);

      setPreferences(nextPreferences);
      setGlobalPreferences(nextPreferences);
      setPreferencesForm(nextForm);
      setInitialPreferencesForm(nextForm);
      setIsEditingPreferences(false);
      setPreferencesSaveNotice('Dashboard preferences saved successfully.');
    } catch (updateError) {
      setPreferencesSaveError(updateError);
    } finally {
      setSavingPreferences(false);
    }
  }

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Member layer</div>
          <h1>SkyWeb account</h1>
          <p>
            Your SkyWeb session is app-scoped separately from SkyServer Admin. This private surface
            now supports editable profile details and dashboard preferences for future saved
            dashboards, watchlists, alerts, and personalized defaults.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSession} type="button">
            Refresh session
          </button>
          <Link className="btn skyweb-btn-primary" to={preferredLandingPage}>
            Open preferred page
          </Link>
        </div>
      </header>

      {loadingAccount && <LoadingState>Loading SkyWeb account...</LoadingState>}

      {!loadingAccount && error && (
        <ErrorState title="Account unavailable.">
          {error.message || 'Unable to load your SkyWeb account.'}
        </ErrorState>
      )}

      {!loadingAccount && !error && (
        <section className="skyweb-account-grid">
          <article className="skyweb-page-card skyweb-account-wide skyweb-profile-card">
            <div className="skyweb-profile-card-header">
              <div className="skyweb-profile-identity">
                {avatarUrl ? (
                  <img
                    alt={`${profileDisplayName} avatar`}
                    className="skyweb-profile-avatar"
                    src={avatarUrl}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="skyweb-profile-avatar skyweb-profile-avatar-fallback"
                  >
                    {avatarInitial}
                  </div>
                )}
                <div>
                  <div className="skyweb-card-kicker">Editable profile</div>
                  <h2>{profileDisplayName}</h2>
                  <p>{profile?.headline || 'Prepared for personalization'}</p>
                </div>
              </div>

              {!isEditingProfile && (
                <button
                  className="btn skyweb-btn-primary"
                  onClick={handleEditProfile}
                  type="button"
                >
                  Edit profile
                </button>
              )}
            </div>

            {profileSaveNotice && <div className="skyweb-profile-notice">{profileSaveNotice}</div>}
            {profileSaveError && (
              <div className="skyweb-auth-alert">
                {profileSaveError.message || 'Unable to save your SkyWeb profile.'}
              </div>
            )}

            <form className="skyweb-profile-form" onSubmit={handleProfileSubmit}>
              <div className="skyweb-profile-form-grid">
                {PROFILE_FIELDS.map((field) => (
                  <label key={field.name}>
                    <span>{field.label}</span>
                    <input
                      autoComplete={field.autoComplete}
                      className="form-control"
                      disabled={!isEditingProfile || savingProfile}
                      name={field.name}
                      onChange={handleProfileInputChange}
                      placeholder={field.placeholder}
                      type="text"
                      value={profileForm[field.name]}
                    />
                  </label>
                ))}
              </div>

              <label className="skyweb-profile-bio-field">
                <span>Bio</span>
                <textarea
                  className="form-control"
                  disabled={!isEditingProfile || savingProfile}
                  name="bio"
                  onChange={handleProfileInputChange}
                  placeholder="A short note about the human behind the dashboards."
                  rows="5"
                  value={profileForm.bio}
                />
              </label>

              <div className="skyweb-profile-form-footer">
                <span>
                  {profileIsDirty
                    ? 'Unsaved profile changes staged.'
                    : 'Profile is synced with SkyServer.'}
                </span>

                {isEditingProfile && (
                  <div className="skyweb-profile-actions">
                    <button
                      className="btn skyweb-btn-ghost"
                      disabled={savingProfile}
                      onClick={handleCancelProfileEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="btn skyweb-btn-primary"
                      disabled={savingProfile || !profileIsDirty}
                      type="submit"
                    >
                      {savingProfile ? 'Saving...' : 'Save profile'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </article>

          <article className="skyweb-page-card skyweb-account-wide skyweb-preferences-card">
            <div className="skyweb-preferences-card-header">
              <div>
                <div className="skyweb-card-kicker">Dashboard preferences</div>
                <h2>Personal defaults</h2>
                <p>
                  Store the first set of SkyWeb member preferences: macro lens, chart window,
                  display density, and landing behavior.
                </p>
              </div>

              {!isEditingPreferences && (
                <button
                  className="btn skyweb-btn-primary"
                  onClick={handleEditPreferences}
                  type="button"
                >
                  Edit preferences
                </button>
              )}
            </div>

            <div className="skyweb-preference-summary-grid" aria-label="Saved preference summary">
              <div>
                <span>Region</span>
                <strong>
                  {preferences.defaultMacroRegion === 'ALL'
                    ? 'All regions'
                    : formatRegion(preferences.defaultMacroRegion)}
                </strong>
              </div>
              <div>
                <span>Category</span>
                <strong>
                  {preferences.defaultMacroCategory === 'ALL'
                    ? 'All categories'
                    : formatCategory(preferences.defaultMacroCategory)}
                </strong>
              </div>
              <div>
                <span>Chart window</span>
                <strong>
                  {getPreferenceLabel('defaultChartWindow', preferences.defaultChartWindow)}
                </strong>
              </div>
            </div>

            {preferencesSaveNotice && (
              <div className="skyweb-profile-notice">{preferencesSaveNotice}</div>
            )}
            {preferencesSaveError && (
              <div className="skyweb-auth-alert">
                {preferencesSaveError.message || 'Unable to save your SkyWeb preferences.'}
              </div>
            )}

            <form className="skyweb-preferences-form" onSubmit={handlePreferencesSubmit}>
              <div className="skyweb-preferences-form-grid">
                {PREFERENCE_FIELDS.map((field) => (
                  <label key={field.name}>
                    <span>{field.label}</span>
                    <select
                      className="form-select"
                      disabled={!isEditingPreferences || savingPreferences}
                      name={field.name}
                      onChange={handlePreferencesInputChange}
                      value={preferencesForm[field.name]}
                    >
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <small>{field.helper}</small>
                  </label>
                ))}
              </div>

              <div className="skyweb-preferences-form-footer">
                <span>
                  {preferencesAreDirty
                    ? 'Unsaved preference changes staged.'
                    : 'Preferences are synced with SkyServer.'}
                </span>

                {isEditingPreferences && (
                  <div className="skyweb-preferences-actions">
                    <button
                      className="btn skyweb-btn-ghost"
                      disabled={savingPreferences}
                      onClick={handleResetPreferences}
                      type="button"
                    >
                      Reset defaults
                    </button>
                    <button
                      className="btn skyweb-btn-ghost"
                      disabled={savingPreferences}
                      onClick={handleCancelPreferencesEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="btn skyweb-btn-primary"
                      disabled={savingPreferences || !preferencesAreDirty}
                      type="submit"
                    >
                      {savingPreferences ? 'Saving...' : 'Save preferences'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </article>

          <article className="skyweb-page-card">
            <div className="skyweb-card-kicker">Identity</div>
            <h2>{profileDisplayName}</h2>
            <dl className="skyweb-detail-list">
              <div>
                <dt>Email</dt>
                <dd>{user?.email || profile?.email || '—'}</dd>
              </div>
              <div>
                <dt>Username</dt>
                <dd>{user?.username || profile?.username || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{user?.status || '—'}</dd>
              </div>
              <div>
                <dt>Profile updated</dt>
                <dd>{profile?.updatedAt ? formatDateTime(profile.updatedAt) : '—'}</dd>
              </div>
            </dl>
          </article>

          <article className="skyweb-page-card">
            <div className="skyweb-card-kicker">Session</div>
            <h2>{session?.appTitle || 'SkyWeb'}</h2>
            <dl className="skyweb-detail-list">
              <div>
                <dt>Application</dt>
                <dd>{session?.appCode || 'SKYWEB'}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{session?.expiresAt ? formatDateTime(session.expiresAt) : '—'}</dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd>{session?.lastSeenAt ? formatDateTime(session.lastSeenAt) : '—'}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{formatPermissionCount(permissions)}</dd>
              </div>
            </dl>
          </article>

          <article className="skyweb-page-card skyweb-account-wide">
            <div className="skyweb-card-kicker">Coming next</div>
            <h2>Saved dashboard layer staged</h2>
            <p>
              The account layer now has editable profile data and persisted dashboard defaults. Next
              comes the first saved-dashboard/watchlist objects that can actually consume these
              preferences and turn this member layer into a personalized command surface.
            </p>
            <div className="skyweb-chip-list">
              <span className="skyweb-chip skyweb-chip-static">Saved dashboards</span>
              <span className="skyweb-chip skyweb-chip-static">Macro watchlists</span>
              <span className="skyweb-chip skyweb-chip-static">Preference-driven presets</span>
              <span className="skyweb-chip skyweb-chip-static">Alert surfaces</span>
            </div>
          </article>

          <article className="skyweb-page-card skyweb-account-wide">
            <div className="skyweb-card-kicker">App permissions</div>
            <h2>{formatPermissionCount(permissions)}</h2>
            <div className="skyweb-chip-list">
              {permissionCodes.length > 0 ? (
                permissionCodes.map((permissionCode) => (
                  <span className="skyweb-chip skyweb-chip-static" key={permissionCode}>
                    {permissionCode}
                  </span>
                ))
              ) : (
                <span className="skyweb-chip skyweb-chip-static">No app permissions returned</span>
              )}
            </div>
          </article>
        </section>
      )}
    </>
  );
}
