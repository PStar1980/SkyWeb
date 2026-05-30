import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import authService from '../services/authService.js';
import { formatDateTime } from '../utils/formatters.js';

const EMPTY_PROFILE_FORM = {
  displayName: '',
  headline: '',
  bio: '',
  timezone: '',
  locale: '',
  avatarUrl: '',
};

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

function formsMatch(left, right) {
  return Object.keys(EMPTY_PROFILE_FORM).every((fieldName) => left[fieldName] === right[fieldName]);
}

function buildProfilePayload(form) {
  return Object.keys(EMPTY_PROFILE_FORM).reduce((payload, fieldName) => {
    payload[fieldName] = form[fieldName];
    return payload;
  }, {});
}

export default function Account() {
  const { permissions, refreshSession, session, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [initialProfileForm, setInitialProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveNotice, setSaveNotice] = useState('');

  const permissionCodes = useMemo(
    () => permissions.map((permission) => permission.permissionCode).filter(Boolean),
    [permissions],
  );

  const profileIsDirty = useMemo(
    () => !formsMatch(profileForm, initialProfileForm),
    [initialProfileForm, profileForm],
  );

  const profileDisplayName =
    profile?.displayName || user?.displayName || user?.username || user?.email || 'SkyWeb member';

  const avatarUrl = profileForm.avatarUrl.trim();
  const avatarInitial = profileDisplayName.trim().charAt(0).toUpperCase() || 'S';

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setError(null);
      setSaveError(null);
      setSaveNotice('');

      try {
        const result = await authService.getProfile();

        if (!active) {
          return;
        }

        const nextProfile = result.profile || null;
        const nextForm = profileToForm(nextProfile);

        setProfile(nextProfile);
        setProfileForm(nextForm);
        setInitialProfileForm(nextForm);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError);
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function handleProfileInputChange(event) {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setSaveError(null);
    setSaveNotice('');
  }

  function handleEditProfile() {
    setIsEditingProfile(true);
    setSaveError(null);
    setSaveNotice('');
  }

  function handleCancelProfileEdit() {
    setProfileForm(initialProfileForm);
    setIsEditingProfile(false);
    setSaveError(null);
    setSaveNotice('');
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (!profileIsDirty) {
      setIsEditingProfile(false);
      setSaveNotice('No profile changes to save.');
      return;
    }

    setSavingProfile(true);
    setSaveError(null);
    setSaveNotice('');

    try {
      const result = await authService.updateProfile(buildProfilePayload(profileForm));
      const nextProfile = result.profile || null;
      const nextForm = profileToForm(nextProfile);

      setProfile(nextProfile);
      setProfileForm(nextForm);
      setInitialProfileForm(nextForm);
      setIsEditingProfile(false);
      setSaveNotice('Profile saved successfully.');
    } catch (updateError) {
      setSaveError(updateError);
    } finally {
      setSavingProfile(false);
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
            now supports editable profile details for future saved dashboards, watchlists, alerts,
            and preferences.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshSession} type="button">
            Refresh session
          </button>
          <Link className="btn skyweb-btn-primary" to="/macro">
            Open dashboard
          </Link>
        </div>
      </header>

      {loadingProfile && <LoadingState>Loading SkyWeb profile...</LoadingState>}

      {!loadingProfile && error && (
        <ErrorState title="Profile unavailable.">
          {error.message || 'Unable to load your SkyWeb profile.'}
        </ErrorState>
      )}

      {!loadingProfile && !error && (
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

            {saveNotice && <div className="skyweb-profile-notice">{saveNotice}</div>}
            {saveError && (
              <div className="skyweb-auth-alert">
                {saveError.message || 'Unable to save your SkyWeb profile.'}
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
            <h2>Personal dashboard layer staged</h2>
            <p>
              The editable profile surface is now in place. Next comes account preferences for saved
              dashboard defaults, macro region choices, chart windows, landing-page behavior, and
              display density.
            </p>
            <div className="skyweb-chip-list">
              <span className="skyweb-chip skyweb-chip-static">Saved dashboards</span>
              <span className="skyweb-chip skyweb-chip-static">Macro watchlists</span>
              <span className="skyweb-chip skyweb-chip-static">Preference presets</span>
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
