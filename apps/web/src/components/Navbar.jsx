import { NavLink } from 'react-router-dom';

function getNavLinkClass({ isActive }) {
  return isActive ? 'skyweb-nav-link active' : 'skyweb-nav-link';
}

export default function Navbar() {
  return (
    <header className="skyweb-navbar">
      <NavLink className="skyweb-brand" to="/">
        <span className="skyweb-brand-mark">⌁</span>
        <span>SkyWeb</span>
      </NavLink>

      <nav className="skyweb-nav" aria-label="Primary navigation">
        <NavLink className={getNavLinkClass} end to="/">
          Home
        </NavLink>
        <NavLink className={getNavLinkClass} end to="/macro">
          Macro
        </NavLink>
        <NavLink className={getNavLinkClass} to="/macro/views">
          Views
        </NavLink>
        <NavLink className={getNavLinkClass} to="/macro/indicators">
          Indicators
        </NavLink>
      </nav>
    </header>
  );
}
