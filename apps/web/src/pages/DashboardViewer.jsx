import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardSurface from '../components/DashboardSurface.jsx';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useDashboards } from '../context/DashboardsContext.jsx';

function getPresentationUrl(dashboardKey) {
  return `${window.location.origin}/dashboards/${dashboardKey}/presentation`;
}

export default function DashboardViewer({ presentationMode = false }) {
  const { dashboardKey } = useParams();
  const {
    dashboardsError,
    getDashboard,
    loadingDashboards,
    refreshDashboards,
    setDefaultDashboard,
  } = useDashboards();
  const [toolbarMessage, setToolbarMessage] = useState('');
  const [settingDefault, setSettingDefault] = useState(false);
  const dashboard = getDashboard(dashboardKey);

  async function handleSetDefault() {
    if (!dashboard?.dashboardKey) {
      return;
    }

    setSettingDefault(true);
    setToolbarMessage('');

    try {
      await setDefaultDashboard(dashboard.dashboardKey);
      setToolbarMessage('Default dashboard updated.');
    } catch (error) {
      setToolbarMessage(error.message || 'Unable to set default dashboard.');
    } finally {
      setSettingDefault(false);
    }
  }

  async function handleCopyPresentationLink() {
    if (!dashboard?.dashboardKey) {
      return;
    }

    const presentationUrl = getPresentationUrl(dashboard.dashboardKey);

    if (!navigator.clipboard) {
      setToolbarMessage('Copy is unavailable in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(presentationUrl);
      setToolbarMessage('Presentation link copied.');
    } catch (error) {
      setToolbarMessage(error.message || 'Unable to copy presentation link.');
    }
  }

  function handlePrintDashboard() {
    setToolbarMessage('Use the print dialog to save this dashboard as a PDF.');
    window.print();
  }

  const headerTitle = dashboard?.title || 'Dashboard surface';
  const headerCopy = presentationMode
    ? `Presentation mode strips the workspace down to the ${SKYWEB_PRODUCT_NAME} dashboard canvas for clean screenshots, PDFs, and portfolio proof.`
    : `View a configured ${SKYWEB_PRODUCT_NAME} dashboard without the builder controls. This is the clean cockpit view for dashboard definitions created from saved macro views.`;

  return (
    <>
      <header
        className={
          presentationMode
            ? 'skyweb-page-header skyweb-dashboard-viewer-header skyweb-dashboard-presentation-header'
            : 'skyweb-page-header skyweb-dashboard-viewer-header'
        }
      >
        <div>
          <div className="skyweb-kicker">
            {presentationMode ? 'Presentation dashboard' : 'Dashboard viewer'}
          </div>
          <h1>{headerTitle}</h1>
          <p>{headerCopy}</p>
          {presentationMode && dashboard && (
            <div className="skyweb-presentation-meta-strip">
              <span>{SKYWEB_PRODUCT_NAME}</span>
              <span>{dashboard.layoutPreset || 'executive'} layout</span>
              <span>{dashboard.items?.length || 0} block(s)</span>
            </div>
          )}
        </div>
        <div className="skyweb-header-actions skyweb-dashboard-presentation-actions">
          <button className="btn skyweb-btn-ghost" onClick={refreshDashboards} type="button">
            Refresh dashboard
          </button>
          {dashboard && !dashboard.isDefault && !presentationMode && (
            <button
              className="btn skyweb-btn-ghost"
              disabled={settingDefault}
              onClick={handleSetDefault}
              type="button"
            >
              {settingDefault ? 'Setting...' : 'Set as default'}
            </button>
          )}
          {dashboard && !presentationMode && (
            <Link
              className="btn skyweb-btn-ghost"
              to={`/dashboards/${dashboard.dashboardKey}/presentation`}
            >
              Presentation view
            </Link>
          )}
          {dashboard && presentationMode && (
            <button
              className="btn skyweb-btn-ghost"
              onClick={handleCopyPresentationLink}
              type="button"
            >
              Copy link
            </button>
          )}
          {presentationMode && (
            <button className="btn skyweb-btn-primary" onClick={handlePrintDashboard} type="button">
              Print / save PDF
            </button>
          )}
          {!presentationMode && (
            <Link className="btn skyweb-btn-ghost" to="/dashboards">
              Dashboard builder
            </Link>
          )}
          {presentationMode && dashboard ? (
            <Link className="btn skyweb-btn-ghost" to={`/dashboards/${dashboard.dashboardKey}`}>
              Exit presentation
            </Link>
          ) : (
            <Link className="btn skyweb-btn-primary" to="/dashboard">
              Open default
            </Link>
          )}
          {toolbarMessage && (
            <p className="skyweb-toolbar-message" role="status">
              {toolbarMessage}
            </p>
          )}
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
          presentationMode={presentationMode}
        />
      )}
    </>
  );
}
