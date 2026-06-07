import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState.jsx';
import StatCard from '../components/StatCard.jsx';
import authService from '../services/authService.js';
import {
  ALERT_SEVERITY_OPTIONS,
  DEFAULT_ALERT_PREFERENCES,
  getSeverityLabel,
  normalizeAlertPreferences,
  notifyAlertSignalsChanged,
} from '../utils/alertSignals.js';
import { formatDateTime } from '../utils/formatters.js';

const BOOLEAN_FIELDS = [
  'inAppEnabled',
  'notifyLow',
  'notifyMedium',
  'notifyHigh',
  'notifyCritical',
  'quietHoursEnabled',
  'emailEnabled',
  'browserEnabled',
];

const FIELD_NAMES = Object.keys(DEFAULT_ALERT_PREFERENCES);

function preferencesToForm(preferences = {}) {
  const normalized = normalizeAlertPreferences(preferences);

  return FIELD_NAMES.reduce((form, fieldName) => {
    form[fieldName] = BOOLEAN_FIELDS.includes(fieldName)
      ? Boolean(normalized[fieldName])
      : String(normalized[fieldName] || DEFAULT_ALERT_PREFERENCES[fieldName]);
    return form;
  }, {});
}

function formsMatch(left, right) {
  return FIELD_NAMES.every((fieldName) => left[fieldName] === right[fieldName]);
}

function buildPayload(form) {
  return FIELD_NAMES.reduce((payload, fieldName) => {
    payload[fieldName] = form[fieldName];
    return payload;
  }, {});
}

function getDeliveryModeLabel(value) {
  return value === 'digest' ? 'Digest staging' : 'Immediate in-app';
}

function getSeverityChannelCount(form) {
  return ['notifyLow', 'notifyMedium', 'notifyHigh', 'notifyCritical'].filter(
    (fieldName) => form[fieldName],
  ).length;
}

function CheckboxField({ checked, disabled, helper, label, name, onChange }) {
  return (
    <label className="skyweb-alert-preference-check">
      <input
        checked={checked}
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="checkbox"
      />
      <span>
        <strong>{label}</strong>
        {helper && <small>{helper}</small>}
      </span>
    </label>
  );
}

export default function MacroAlertPreferences() {
  const [preferenceRow, setPreferenceRow] = useState(null);
  const [form, setForm] = useState(preferencesToForm(DEFAULT_ALERT_PREFERENCES));
  const [initialForm, setInitialForm] = useState(preferencesToForm(DEFAULT_ALERT_PREFERENCES));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const isDirty = useMemo(() => !formsMatch(form, initialForm), [form, initialForm]);
  const severityChannelCount = getSeverityChannelCount(form);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      setLoading(true);
      setError(null);
      setMessage('');

      try {
        const payload = await authService.getAlertPreferences();

        if (!active) {
          return;
        }

        const nextForm = preferencesToForm(payload.preferences || DEFAULT_ALERT_PREFERENCES);
        setPreferenceRow(payload.preferenceRow || null);
        setForm(nextForm);
        setInitialForm(nextForm);
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

    loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  function handleInputChange(event) {
    const { checked, name, type, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
    setMessage('');
  }

  function handleEdit() {
    setEditing(true);
    setError(null);
    setMessage('');
  }

  function handleCancel() {
    setForm(initialForm);
    setEditing(false);
    setError(null);
    setMessage('');
  }

  function handleReset() {
    setForm(preferencesToForm(DEFAULT_ALERT_PREFERENCES));
    setMessage('Default alert preferences staged. Save to apply them.');
    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isDirty) {
      setEditing(false);
      setMessage('No alert preference changes to save.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage('');

    try {
      const payload = await authService.updateAlertPreferences(buildPayload(form));
      const nextForm = preferencesToForm(payload.preferences || DEFAULT_ALERT_PREFERENCES);

      setPreferenceRow(payload.preferenceRow || null);
      setForm(nextForm);
      setInitialForm(nextForm);
      setEditing(false);
      setMessage(
        'Alert preferences saved. Dashboard, overview, and navbar signal surfacing will use these rules.',
      );
      notifyAlertSignalsChanged();
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="skyweb-page-header skyweb-alert-preferences-header">
        <div>
          <div className="skyweb-kicker">Macro alerts</div>
          <h1>Alert preferences</h1>
          <p>
            Tune which triggered macro signals surface across the app. This phase stores the
            delivery contract first; email and browser delivery remain staged until the next pass.
          </p>
        </div>
        <div className="skyweb-header-actions">
          <Link className="btn skyweb-btn-ghost" to="/macro/alerts">
            Back to alert rules
          </Link>
          {!editing && !loading && !error && (
            <button className="btn skyweb-btn-primary" onClick={handleEdit} type="button">
              Edit preferences
            </button>
          )}
        </div>
      </header>

      {loading && <LoadingState>Loading alert preferences...</LoadingState>}

      {!loading && error && (
        <ErrorState title="Alert preferences unavailable.">
          {error.message || 'Unable to load alert preferences.'}
        </ErrorState>
      )}

      {!loading && !error && (
        <>
          <section className="skyweb-metric-grid skyweb-alert-preference-summary">
            <StatCard
              label="In-app surfacing"
              value={form.inAppEnabled ? 'Enabled' : 'Paused'}
              detail="Navbar, dashboard, overview"
            />
            <StatCard
              label="Minimum severity"
              value={getSeverityLabel(form.minimumSeverity)}
              detail="Lowest surfaced signal"
            />
            <StatCard
              label="Delivery mode"
              value={getDeliveryModeLabel(form.deliveryMode)}
              detail={
                form.deliveryMode === 'digest' ? `${form.digestCadence} digest` : 'Open queue'
              }
            />
            <StatCard
              label="Severity channels"
              value={`${severityChannelCount}/4`}
              detail="Low / medium / high / critical"
            />
          </section>

          {message && <div className="skyweb-success">{message}</div>}

          <section className="skyweb-page-card skyweb-alert-preferences-card">
            <div className="skyweb-preferences-card-header">
              <div>
                <div className="skyweb-card-kicker">Delivery prep</div>
                <h2>Signal surfacing contract</h2>
                <p>
                  These settings control in-app signal surfacing now and reserve the shape for
                  future external delivery. Event history stays permanent either way.
                </p>
              </div>
              <span className="skyweb-mini-pill">
                Updated {preferenceRow?.updatedAt ? formatDateTime(preferenceRow.updatedAt) : '—'}
              </span>
            </div>

            <form className="skyweb-alert-preferences-form" onSubmit={handleSubmit}>
              <section className="skyweb-alert-preference-section">
                <div>
                  <h3>In-app signal surfacing</h3>
                  <p>
                    Controls the global Signals pill, Macro Overview strip, and dashboard alert
                    card. The alert-rule page still keeps the full control panel available.
                  </p>
                </div>
                <div className="skyweb-alert-preference-grid">
                  <CheckboxField
                    checked={form.inAppEnabled}
                    disabled={!editing || saving}
                    helper="Show qualifying open signals across the app."
                    label="Enable in-app signals"
                    name="inAppEnabled"
                    onChange={handleInputChange}
                  />
                  <label>
                    <span>Minimum surfaced severity</span>
                    <select
                      className="form-select"
                      disabled={!editing || saving}
                      name="minimumSeverity"
                      onChange={handleInputChange}
                      value={form.minimumSeverity}
                    >
                      {ALERT_SEVERITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <small>
                      Lower-severity open events remain in history and can still be reviewed.
                    </small>
                  </label>
                </div>
              </section>

              <section className="skyweb-alert-preference-section">
                <div>
                  <h3>Severity channels</h3>
                  <p>
                    Pick which severity lanes should be eligible for notification delivery. This is
                    separate from each rule’s own severity setting.
                  </p>
                </div>
                <div className="skyweb-alert-preference-grid skyweb-alert-preference-grid-four">
                  <CheckboxField
                    checked={form.notifyLow}
                    disabled={!editing || saving}
                    helper="Gentle watches and low-risk movement."
                    label="Low"
                    name="notifyLow"
                    onChange={handleInputChange}
                  />
                  <CheckboxField
                    checked={form.notifyMedium}
                    disabled={!editing || saving}
                    helper="Normal alert conditions."
                    label="Medium"
                    name="notifyMedium"
                    onChange={handleInputChange}
                  />
                  <CheckboxField
                    checked={form.notifyHigh}
                    disabled={!editing || saving}
                    helper="Important movement worth review."
                    label="High"
                    name="notifyHigh"
                    onChange={handleInputChange}
                  />
                  <CheckboxField
                    checked={form.notifyCritical}
                    disabled={!editing || saving}
                    helper="Critical conditions should usually stay on."
                    label="Critical"
                    name="notifyCritical"
                    onChange={handleInputChange}
                  />
                </div>
              </section>

              <section className="skyweb-alert-preference-section">
                <div>
                  <h3>External delivery staging</h3>
                  <p>
                    Stored now, not sending yet. This gives the future email/browser delivery phase
                    a clean preference shape instead of a bolt-on mess.
                  </p>
                </div>
                <div className="skyweb-alert-preference-grid">
                  <label>
                    <span>Delivery mode</span>
                    <select
                      className="form-select"
                      disabled={!editing || saving}
                      name="deliveryMode"
                      onChange={handleInputChange}
                      value={form.deliveryMode}
                    >
                      <option value="immediate">Immediate</option>
                      <option value="digest">Digest</option>
                    </select>
                    <small>Immediate means surface as soon as a qualifying signal opens.</small>
                  </label>
                  <label>
                    <span>Digest cadence</span>
                    <select
                      className="form-select"
                      disabled={!editing || saving || form.deliveryMode !== 'digest'}
                      name="digestCadence"
                      onChange={handleInputChange}
                      value={form.digestCadence}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    <small>Reserved for the future digest worker.</small>
                  </label>
                  <CheckboxField
                    checked={form.emailEnabled}
                    disabled={!editing || saving}
                    helper="Preference only. Email sending is not active yet."
                    label="Email delivery staged"
                    name="emailEnabled"
                    onChange={handleInputChange}
                  />
                  <CheckboxField
                    checked={form.browserEnabled}
                    disabled={!editing || saving}
                    helper="Preference only. Browser push is not active yet."
                    label="Browser delivery staged"
                    name="browserEnabled"
                    onChange={handleInputChange}
                  />
                </div>
              </section>

              <section className="skyweb-alert-preference-section">
                <div>
                  <h3>Quiet hours</h3>
                  <p>
                    Quiet-hours fields are stored for future delivery suppression. In-app history
                    and the open queue are still preserved permanently.
                  </p>
                </div>
                <div className="skyweb-alert-preference-grid">
                  <CheckboxField
                    checked={form.quietHoursEnabled}
                    disabled={!editing || saving}
                    helper="Future delivery can pause during this window."
                    label="Enable quiet hours"
                    name="quietHoursEnabled"
                    onChange={handleInputChange}
                  />
                  <label>
                    <span>Start</span>
                    <input
                      className="form-control"
                      disabled={!editing || saving || !form.quietHoursEnabled}
                      name="quietHoursStart"
                      onChange={handleInputChange}
                      type="time"
                      value={form.quietHoursStart}
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      className="form-control"
                      disabled={!editing || saving || !form.quietHoursEnabled}
                      name="quietHoursEnd"
                      onChange={handleInputChange}
                      type="time"
                      value={form.quietHoursEnd}
                    />
                  </label>
                  <label>
                    <span>Timezone</span>
                    <input
                      className="form-control"
                      disabled={!editing || saving || !form.quietHoursEnabled}
                      name="quietHoursTimezone"
                      onChange={handleInputChange}
                      placeholder="America/Toronto"
                      type="text"
                      value={form.quietHoursTimezone}
                    />
                  </label>
                </div>
              </section>

              <div className="skyweb-preferences-form-footer">
                <span>
                  {isDirty
                    ? 'Unsaved alert preference changes staged.'
                    : 'Alert preferences are synced with SkyServer.'}
                </span>

                {editing && (
                  <div className="skyweb-preferences-actions">
                    <button
                      className="btn skyweb-btn-ghost"
                      disabled={saving}
                      onClick={handleReset}
                      type="button"
                    >
                      Reset defaults
                    </button>
                    <button
                      className="btn skyweb-btn-ghost"
                      disabled={saving}
                      onClick={handleCancel}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="btn skyweb-btn-primary"
                      disabled={saving || !isDirty}
                      type="submit"
                    >
                      {saving ? 'Saving...' : 'Save alert preferences'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </section>
        </>
      )}
    </>
  );
}
