import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useAuth } from '../context/AuthContext.jsx';

function getNavLinkClass({ isActive }) {
  return isActive ? 'skyweb-nav-link active' : 'skyweb-nav-link';
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, logout, user } = useAuth();
  const macroActive = location.pathname.startsWith('/macro') || location.pathname === '/dashboard';

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
        <div className="skyweb-nav-dropdown">
          <button
            aria-expanded="false"
            className={
              macroActive
                ? 'skyweb-nav-link skyweb-nav-dropdown-trigger active'
                : 'skyweb-nav-link skyweb-nav-dropdown-trigger'
            }
            type="button"
          >
            Macro
            <span aria-hidden="true" className="skyweb-nav-caret">
              ▾
            </span>
          </button>
          <div className="skyweb-nav-menu" role="menu">
            <NavLink className={getNavLinkClass} end role="menuitem" to="/macro">
              Overview
            </NavLink>
            {!loading && isAuthenticated && (
              <NavLink className={getNavLinkClass} role="menuitem" to="/dashboard">
                Dashboard
              </NavLink>
            )}
          </div>
        </div>
        <NavLink className={getNavLinkClass} to="/macro/views">
          Views
        </NavLink>
        <NavLink className={getNavLinkClass} to="/macro/indicators">
          Indicators
        </NavLink>
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
