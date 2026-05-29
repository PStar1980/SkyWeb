import { Link } from 'react-router-dom';

export default function StoryCard({ kicker, title, value, detail, meta, to }) {
  const content = (
    <>
      {kicker && <div className="skyweb-card-kicker">{kicker}</div>}
      <h2>{title}</h2>
      <strong>{value ?? '—'}</strong>
      {detail && <p>{detail}</p>}
      {meta && <span>{meta}</span>}
    </>
  );

  if (to) {
    return (
      <Link className="skyweb-story-card skyweb-story-card-link" to={to}>
        {content}
      </Link>
    );
  }

  return <article className="skyweb-story-card">{content}</article>;
}
