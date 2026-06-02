import { Link } from 'react-router-dom';
import { formatCategory, formatDate, formatNumber, formatRegion } from '../utils/formatters.js';

function getStats(view) {
  return view?.stats || {};
}

function getSavedViewLabel(savedView, view) {
  return savedView?.displayLabel || view?.label || savedView?.viewKey || view?.viewKey || '';
}

function getDraftSortOrder(draftMetadata) {
  return draftMetadata?.sortOrder ?? '0';
}

export default function MacroViewCatalogCard({
  view,
  savedView = null,
  isAuthenticated = false,
  editing = false,
  draftMetadata = null,
  draftDirty = false,
  updating = false,
  onCancelEdit,
  onDraftChange,
  onEditMetadata,
  onPinToggle,
  onRemoveSaved,
  onSaveMetadata,
  onSaveView,
}) {
  const stats = getStats(view);
  const latestDate = stats.maxDate || view?.maxDate;
  const totalRows = stats.totalRows ?? view?.totalRows;
  const saved = Boolean(savedView);
  const title = getSavedViewLabel(savedView, view);
  const originalTitle = view?.label && title !== view.label ? view.label : '';
  const busy = Boolean(updating);

  return (
    <article className="skyweb-view-card skyweb-view-card-actionable">
      <div className="skyweb-view-card-topline">
        <div className="skyweb-card-kicker">
          {formatRegion(view.region)} · {formatCategory(view.category)}
        </div>
        <div className="skyweb-view-card-badges" aria-label="Saved view status">
          {saved && <span className="skyweb-saved-pill">Saved</span>}
          {saved && savedView?.pinned && <span className="skyweb-saved-pill">Pinned</span>}
          {saved && !savedView?.pinned && (
            <span className="skyweb-saved-pill skyweb-saved-pill-muted">Unpinned</span>
          )}
        </div>
      </div>

      <h2>{title}</h2>
      {originalTitle && <p className="skyweb-view-card-original">Original: {originalTitle}</p>}
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
        {saved && (
          <div>
            <dt>Order</dt>
            <dd>{savedView.sortOrder ?? 0}</dd>
          </div>
        )}
      </dl>

      {editing && saved && (
        <div className="skyweb-catalog-metadata-editor">
          <label>
            <span>Custom label</span>
            <input
              className="form-control"
              maxLength={160}
              onChange={(event) => onDraftChange('displayLabel', event.target.value)}
              placeholder={view.label || view.viewKey}
              value={draftMetadata?.displayLabel || ''}
            />
          </label>

          <label>
            <span>Display order</span>
            <input
              className="form-control"
              inputMode="numeric"
              onChange={(event) => onDraftChange('sortOrder', event.target.value)}
              type="number"
              value={getDraftSortOrder(draftMetadata)}
            />
          </label>

          <p className="skyweb-catalog-note-hint">
            Private notes live on the individual view page so the catalog stays fast to manage.
          </p>

          <div className="skyweb-catalog-action-row">
            <button className="btn skyweb-btn-ghost" onClick={onCancelEdit} type="button">
              Cancel
            </button>
            <button
              className="btn skyweb-btn-primary"
              disabled={busy || !draftDirty}
              onClick={() => onSaveMetadata(savedView)}
              type="button"
            >
              {busy ? 'Saving...' : 'Save metadata'}
            </button>
          </div>
        </div>
      )}

      <div className="skyweb-catalog-action-row skyweb-catalog-primary-actions">
        <Link className="btn skyweb-btn-primary" to={`/macro/views/${view.viewKey}`}>
          Open view
        </Link>

        {isAuthenticated ? (
          <>
            {!saved ? (
              <button
                className="btn skyweb-btn-ghost"
                disabled={busy}
                onClick={() => onSaveView(view)}
                type="button"
              >
                {busy ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <>
                <button
                  className="btn skyweb-btn-ghost"
                  disabled={busy}
                  onClick={() => onPinToggle(savedView)}
                  type="button"
                >
                  {busy ? 'Updating...' : savedView.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  className="btn skyweb-btn-ghost"
                  disabled={busy || editing}
                  onClick={() => onEditMetadata(savedView)}
                  type="button"
                >
                  Edit metadata
                </button>
                <button
                  className="btn skyweb-btn-ghost"
                  disabled={busy}
                  onClick={() => onRemoveSaved(view.viewKey)}
                  type="button"
                >
                  Remove
                </button>
              </>
            )}
          </>
        ) : (
          <Link className="btn skyweb-btn-ghost" to="/login">
            Sign in to save
          </Link>
        )}
      </div>
    </article>
  );
}
