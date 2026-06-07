export default function StatCard({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`skyweb-metric-card skyweb-metric-card-${tone}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
