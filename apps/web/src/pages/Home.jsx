import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <section className="skyweb-hero">
        <div className="skyweb-hero-content">
          <div className="skyweb-kicker">Sky ecosystem public layer</div>
          <h1>Macro dashboards, living data, and public proof of work.</h1>
          <p>
            SkyWeb is the presentation layer for curated SkyServer data. Phase 9 begins with a macro
            dashboard foundation, then grows into charts, saved views, and public-facing evidence
            surfaces.
          </p>
          <div className="skyweb-hero-actions">
            <Link className="btn skyweb-btn-primary" to="/macro">
              Open macro overview
            </Link>
            <Link className="btn skyweb-btn-ghost" to="/macro/views">
              Browse data views
            </Link>
          </div>
        </div>
        <div className="skyweb-hero-panel">
          <div className="skyweb-panel-label">Phase 9.0</div>
          <h2>Foundation online</h2>
          <ul>
            <li>SkyWeb identity cleaned up</li>
            <li>SkyServer API proxy configured</li>
            <li>Macro routes staged</li>
            <li>Public dashboard shell ready</li>
          </ul>
        </div>
      </section>

      <section className="skyweb-section-grid">
        <article className="skyweb-card">
          <div className="skyweb-card-kicker">Data plane</div>
          <h2>Curated macro views</h2>
          <p>
            SkyWeb will consume SkyServer macro APIs for inflation, growth, labor, rates, liquidity,
            housing, and U.S./Canada comparison views.
          </p>
        </article>
        <article className="skyweb-card">
          <div className="skyweb-card-kicker">Presentation layer</div>
          <h2>Built for dashboards</h2>
          <p>
            The app shell is now ready for tables, cards, trend previews, and eventually polished
            chart-driven experiences.
          </p>
        </article>
        <article className="skyweb-card">
          <div className="skyweb-card-kicker">Future auth</div>
          <h2>Prepared for SKYWEB users</h2>
          <p>
            SkyServer now supports application-scoped auth, which gives SkyWeb a clean future
            boundary for user profiles and personalization.
          </p>
        </article>
      </section>
    </>
  );
}
