import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx';
import macroService from '../services/macroService.js';
import { formatCategory } from '../utils/formatters.js';

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

function getUniqueValues(items, key) {
  return Array.from(new Set(items.map((item) => item[key]).filter(Boolean))).sort();
}

export default function MacroIndicators() {
  const [indicators, setIndicators] = useState([]);
  const [filter, setFilter] = useState('');
  const [source, setSource] = useState('ALL');
  const [frequency, setFrequency] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sources = useMemo(() => ['ALL', ...getUniqueValues(indicators, 'source')], [indicators]);
  const frequencies = useMemo(
    () => ['ALL', ...getUniqueValues(indicators, 'frequency')],
    [indicators],
  );

  const filteredIndicators = useMemo(
    () =>
      indicators.filter((indicator) => {
        if (source !== 'ALL' && indicator.source !== source) {
          return false;
        }

        if (frequency !== 'ALL' && indicator.frequency !== frequency) {
          return false;
        }

        return matchesFilter(indicator, filter);
      }),
    [filter, frequency, indicators, source],
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

      {!loading && !error && (
        <section className="skyweb-metric-grid skyweb-indicator-metrics">
          <StatCard label="Indicators" value={indicators.length} detail="Active source series" />
          <StatCard label="Sources" value={sources.length - 1} detail="Data providers" />
          <StatCard label="Frequencies" value={frequencies.length - 1} detail="Update rhythms" />
          <StatCard label="Visible" value={filteredIndicators.length} detail="After filters" />
        </section>
      )}

      <section className="skyweb-toolbar skyweb-toolbar-three">
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
        <select
          className="form-select"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value)}
        >
          {frequencies.map((frequencyOption) => (
            <option key={frequencyOption} value={frequencyOption}>
              {frequencyOption === 'ALL' ? 'All frequencies' : formatCategory(frequencyOption)}
            </option>
          ))}
        </select>
      </section>

      {loading && <LoadingState>Loading indicators...</LoadingState>}
      {!loading && error && (
        <ErrorState title="Indicators unavailable.">
          {error.status === 401 || error.status === 403
            ? 'SkyServer public indicator access is unavailable. Confirm the API is running and /api/public/macro is mounted.'
            : error.message}
        </ErrorState>
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
                    <td>{indicator.frequency ? formatCategory(indicator.frequency) : '—'}</td>
                    <td>{indicator.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredIndicators.length === 0 && <EmptyState>No indicators matched.</EmptyState>}
        </section>
      )}
    </>
  );
}
