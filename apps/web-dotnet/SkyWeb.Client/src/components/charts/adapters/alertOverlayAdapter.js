export function adaptAlertRuleToThreshold(alertRule = {}) {
  const threshold = Number(alertRule.thresholdValue ?? alertRule.threshold);

  if (!Number.isFinite(threshold)) {
    return null;
  }

  return {
    label: alertRule.title || alertRule.alertTitle || 'Alert threshold',
    operator: alertRule.conditionOperator || alertRule.condition || '',
    severity: alertRule.severity || 'medium',
    value: threshold,
  };
}

export function adaptAlertEvents(events = []) {
  return events
    .map((event) => ({
      date: event.observedAt || event.observedDate || event.createdAt || event.evaluatedAt || null,
      message: event.message || event.description || 'Alert event',
      severity: event.severity || 'medium',
      value: event.observedValue ?? event.value ?? null,
    }))
    .filter((event) => event.date);
}
