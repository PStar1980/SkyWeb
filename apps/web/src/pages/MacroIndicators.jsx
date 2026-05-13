import { useEffect, useMemo, useState } from 'react';
import macroService from '../services/macroService.js';

function matchesFilter(indicator, filter) {
  if (!filter) {
    return true;
  }

  const haystack = [
    indicator.indicatorCode,
    indicator.source,
    indicator.description,
    indicator.frequency,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(filter.toLowerCase());
}

export default function MacroIndicators() {
  const [indicators, setIndicators] = useState([]);
  const [filter, setFilter] = useState('');
  const [source, setSource] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sources = useMemo(
    () => [
      'ALL',
      ...Array.from(
        new Set(indicators.map((indicator) => indicator.source).filter(Boolean)),
      ).sort(),
    ],
    [indicators],
  );

  const filteredIndicators = useMemo(
    () =>
      indicators.filter((indicator) => {
        if (source !== 'ALL' && indicator.source !== source) {
          return false;
        }

        return matchesFilter(indicator, filter);
      }),
    [filter, indicators, source],
  );

  useEffect(() => {
    let active = true;

    async function loadIndicators() {
      setLoading(true);
      setError(null);

      try {
        const payload = await macroService.listIndicators({ limit: 500, active: true });

        if (active) {
          setIndicators(payload.items || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadIndicators();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="skyweb-page-header">
        <div>
          <div className="skyweb-kicker">Macro catalog</div>
          <h1>Indicators</h1>
          <p>Explore the source indicators that power SkyServer macro views.</p>
        </div>
      </header>

      <section className="skyweb-toolbar">
        <input
          className="form-control"
          placeholder="Search indicators..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          className="form-select"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          {sources.map((sourceOption) => (
            <option key={sourceOption} value={sourceOption}>
              {sourceOption === 'ALL' ? 'All sources' : sourceOption}
            </option>
          ))}
        </select>
      </section>

      {loading && <div className="skyweb-loading">Loading indicators...</div>}
      {!loading && error && (
        <section className="skyweb-alert">
          <strong>Indicators unavailable.</strong>
          <p>
            {error.status === 401 || error.status === 403
              ? 'Public indicator access is coming after the public macro API bridge.'
              : error.message}
          </p>
        </section>
      )}

      {!loading && !error && (
        <section className="skyweb-table-card">
          <div className="skyweb-table-header">
            <div>
              <div className="skyweb-card-kicker">Active indicators</div>
              <h2>{filteredIndicators.length} indicator(s)</h2>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table skyweb-table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Source</th>
                  <th>Frequency</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndicators.map((indicator) => (
                  <tr key={indicator.indicatorCode}>
                    <td className="skyweb-mono">{indicator.indicatorCode}</td>
                    <td>{indicator.source}</td>
                    <td>{indicator.frequency || '—'}</td>
                    <td>{indicator.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredIndicators.length === 0 && (
            <div className="skyweb-empty">No indicators matched.</div>
          )}
        </section>
      )}
    </>
  );
}
