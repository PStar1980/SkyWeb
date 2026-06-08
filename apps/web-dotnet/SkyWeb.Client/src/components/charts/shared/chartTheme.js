import { CHART_COLORS, TONE_COLORS } from './chartTypes.js';

export const chartPalette = CHART_COLORS;
export const tonePalette = TONE_COLORS;

export const chartSurface = {
  background: 'transparent',
  panel: 'rgba(5, 10, 20, 0.42)',
  text: '#dce8ff',
  mutedText: 'rgba(220, 232, 255, 0.58)',
  gridLine: 'rgba(138, 163, 202, 0.1)',
  gridLineStrong: 'rgba(138, 163, 202, 0.28)',
  hoverLine: 'rgba(220, 232, 255, 0.42)',
  splitLine: 'rgba(138, 163, 202, 0.08)',
  tooltipBackground: 'rgba(8, 14, 28, 0.96)',
  tooltipBorder: 'rgba(138, 163, 202, 0.24)',
  zeroLine: 'rgba(220, 232, 255, 0.28)',
  pointBorder: 'rgba(5, 10, 20, 0.95)',
  alertLabelBackground: 'rgba(5, 10, 20, 0.86)',
};

export const alertSeverityPalette = {
  low: '#70b7ff',
  medium: '#ffb86b',
  high: '#fb923c',
  critical: '#fb7185',
};

export function getToneColor(tone = 'default') {
  return tonePalette[tone] || tonePalette.default;
}

export function getAlertSeverityColor(severity = 'medium') {
  return alertSeverityPalette[severity] || alertSeverityPalette.medium;
}
