import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import authService from '../services/authService.js';
import { formatDateTime } from '../utils/formatters.js';

function formatPermissionCount(permissions = []) {
  return `${permissions.length} permission${permissions.length === 1 ? '' : 's'}`;
}

export default function Account() {
  const { permissions, refreshSession, session, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);

  const permissionCodes = useMemo(
    () => permissions.map((permission) => permission.permissionCode).filter(Boolean),
    [permissions],
  );

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setError(null);

      try {
        const result = await authService.getProfile();

        if (!active) {
          return;
        }

        setProfile(result.profile || null);
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

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Member layer</div>
          <h1>SkyWeb account</h1>
          <p>
            Your SkyWeb session is app-scoped separately from SkyServer Admin. This page is the
            first private surface for future saved dashboards, watchlists, alerts, and preferences.
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
          <article className="skyweb-page-card">
            <div className="skyweb-card-kicker">Identity</div>
            <h2>{user?.displayName || user?.username || user?.email}</h2>
            <dl className="skyweb-detail-list">
              <div>
                <dt>Email</dt>
                <dd>{user?.email || '—'}</dd>
              </div>
              <div>
                <dt>Username</dt>
                <dd>{user?.username || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{user?.status || '—'}</dd>
              </div>
              <div>
                <dt>SkyWeb profile</dt>
                <dd>{profile?.headline || 'Prepared for personalization'}</dd>
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
              The profile and preferences schema is ready for saved dashboards, tracked macro views,
              alert subscriptions, and personalized landing pages.
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
