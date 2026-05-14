export function LoadingState({ children = 'Loading...' }) {
  return <div className="skyweb-loading">{children}</div>;
}

export function EmptyState({ children = 'No records found.' }) {
  return <div className="skyweb-empty">{children}</div>;
}

export function ErrorState({ title = 'Something went wrong.', children }) {
  return (
    <section className="skyweb-alert">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </section>
  );
}
