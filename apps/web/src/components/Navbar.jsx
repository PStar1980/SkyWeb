import { NavLink, useNavigate } from 'react-router-dom';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useAuth } from '../context/AuthContext.jsx';

function getNavLinkClass({ isActive }) {
  return isActive ? 'skyweb-nav-link active' : 'skyweb-nav-link';
}

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, logout, user } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="skyweb-navbar">
      <NavLink className="skyweb-brand" to="/">
        <span className="skyweb-brand-mark">⌁</span>
        <span className="skyweb-brand-name">{SKYWEB_PRODUCT_NAME}</span>
      </NavLink>

      <nav className="skyweb-nav" aria-label="Primary navigation">
        <NavLink className={getNavLinkClass} end to="/">
          Home
        </NavLink>
        <NavLink className={getNavLinkClass} end to="/macro">
          Macro
        </NavLink>
        {!loading && isAuthenticated && (
          <NavLink className={getNavLinkClass} to="/dashboard">
            Dashboard
          </NavLink>
        )}
        <NavLink className={getNavLinkClass} to="/macro/views">
          Views
        </NavLink>
        <NavLink className={getNavLinkClass} to="/macro/indicators">
          Indicators
        </NavLink>
        {!loading && isAuthenticated && (
          <NavLink className={getNavLinkClass} to="/saved">
            Saved
          </NavLink>
        )}
      </nav>

      <div className="skyweb-nav-account">
        {!loading && isAuthenticated && (
          <>
            <NavLink className={getNavLinkClass} to="/account">
              {user?.displayName || user?.username || 'Account'}
            </NavLink>
            <button className="skyweb-nav-button" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        )}
        {!loading && !isAuthenticated && (
          <NavLink className={getNavLinkClass} to="/login">
            Login
          </NavLink>
        )}
      </div>
    </header>
  );
}
