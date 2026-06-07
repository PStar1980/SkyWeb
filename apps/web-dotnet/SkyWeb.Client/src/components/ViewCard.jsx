import { Link } from 'react-router-dom';
import { formatCategory, formatDate, formatNumber, formatRegion } from '../utils/formatters.js';

function getStats(view) {
  return view?.stats || {};
}

export default function ViewCard({ view, compact = false, saved = false }) {
  const stats = getStats(view);
  const latestDate = stats.maxDate || view?.maxDate;
  const totalRows = stats.totalRows ?? view?.totalRows;

  return (
    <Link
      className={`skyweb-view-card ${compact ? 'skyweb-view-card-compact' : ''}`}
      to={`/macro/views/${view.viewKey}`}
    >
      <div className="skyweb-view-card-topline">
        <div className="skyweb-card-kicker">
          {formatRegion(view.region)} · {formatCategory(view.category)}
        </div>
        {saved && <span className="skyweb-saved-pill">Saved</span>}
      </div>
      <h2>{view.label}</h2>
      <p>{view.description}</p>
      <dl className="skyweb-view-meta">
        <div>
          <dt>Latest</dt>
          <dd>{latestDate ? formatDate(latestDate) : '—'}</dd>
        </div>
        <div>
          <dt>Rows</dt>
          <dd>{totalRows !== undefined ? formatNumber(totalRows, { compact: true }) : '—'}</dd>
        </div>
      </dl>
      <span className="skyweb-card-link">Open view →</span>
    </Link>
  );
}
