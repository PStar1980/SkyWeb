import { Link, useParams } from 'react-router-dom';
import DashboardSurface from '../components/DashboardSurface.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useDashboards } from '../context/DashboardsContext.jsx';

export default function DashboardViewer() {
  const { dashboardKey } = useParams();
  const {
    dashboardsError,
    getDashboard,
    loadingDashboards,
    refreshDashboards,
    setDefaultDashboard,
  } = useDashboards();
  const dashboard = getDashboard(dashboardKey);

  async function handleSetDefault() {
    if (!dashboard?.dashboardKey) {
      return;
    }

    await setDefaultDashboard(dashboard.dashboardKey);
  }

  return (
    <>
      <header className="skyweb-page-header skyweb-dashboard-viewer-header">
        <div>
          <div className="skyweb-kicker">Dashboard viewer</div>
          <h1>{dashboard?.title || 'Dashboard surface'}</h1>
          <p>
            View a configured {SKYWEB_PRODUCT_NAME} dashboard without the builder controls. This is
            the clean cockpit view for dashboard definitions created from saved macro views.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshDashboards} type="button">
            Refresh dashboard
          </button>
          {dashboard && !dashboard.isDefault && (
            <button className="btn skyweb-btn-ghost" onClick={handleSetDefault} type="button">
              Set as default
            </button>
          )}
          <Link className="btn skyweb-btn-ghost" to="/dashboards">
            Dashboard builder
          </Link>
          <Link className="btn skyweb-btn-primary" to="/dashboard">
            Open default
          </Link>
        </div>
      </header>

      {loadingDashboards && <LoadingState>Loading dashboard...</LoadingState>}

      {!loadingDashboards && dashboardsError && (
        <ErrorState title="Dashboard unavailable.">
          {dashboardsError.message || 'Unable to load this dashboard.'}
        </ErrorState>
      )}

      {!loadingDashboards && !dashboardsError && !dashboard && (
        <section className="skyweb-page-card skyweb-dashboard-viewer-empty-card">
          <div className="skyweb-card-kicker">Dashboard not found</div>
          <h2>This dashboard is not on your shelf</h2>
          <p>
            The dashboard key may have changed, or this dashboard may have been removed from your
            private workspace.
          </p>
          <Link className="btn skyweb-btn-primary" to="/dashboards">
            Back to dashboards
          </Link>
        </section>
      )}

      {!loadingDashboards && !dashboardsError && dashboard && (
        <DashboardSurface
          dashboard={dashboard}
          emptyAction={
            <Link className="skyweb-card-link" to="/dashboards">
              Add dashboard items →
            </Link>
          }
        />
      )}
    </>
  );
}
