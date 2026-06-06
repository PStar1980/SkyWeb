import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { SKYWEB_PRODUCT_NAME } from '../constants/branding.js';
import { useAuth } from '../context/AuthContext.jsx';
import authService from '../services/authService.js';
import {
  ALERT_SIGNALS_CHANGED_EVENT,
  getSurfacedAlertNotifications,
  normalizeAlertPreferences,
} from '../utils/alertSignals.js';

function getNavLinkClass({ isActive }) {
  return isActive ? 'skyweb-nav-link active' : 'skyweb-nav-link';
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, logout, user } = useAuth();
  const macroActive = location.pathname.startsWith('/macro') || location.pathname === '/dashboard';
  const [macroMenuOpen, setMacroMenuOpen] = useState(false);
  const [openSignalCount, setOpenSignalCount] = useState(0);
  const macroDropdownRef = useRef(null);

  function openMacroMenu() {
    setMacroMenuOpen(true);
  }

  function closeMacroMenu() {
    setMacroMenuOpen(false);
  }

  function handleMacroBlur(event) {
    if (!macroDropdownRef.current?.contains(event.relatedTarget)) {
      closeMacroMenu();
    }
  }

  function handleMacroKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMacroMenu();
    }
  }

  useEffect(() => {
    let active = true;

    async function loadOpenSignals() {
      if (loading || !isAuthenticated) {
        setOpenSignalCount(0);
        return;
      }

      try {
        const [payload, preferencesPayload] = await Promise.all([
          authService.listAlertNotifications({ status: 'open', limit: 100 }),
          authService.getAlertPreferences(),
        ]);
        const surfacedNotifications = getSurfacedAlertNotifications(
          payload.items || [],
          normalizeAlertPreferences(preferencesPayload.preferences),
        );

        if (active) {
          setOpenSignalCount(surfacedNotifications.length);
        }
      } catch {
        if (active) {
          setOpenSignalCount(0);
        }
      }
    }

    function handleSignalsChanged() {
      loadOpenSignals();
    }

    loadOpenSignals();
    window.addEventListener(ALERT_SIGNALS_CHANGED_EVENT, handleSignalsChanged);

    return () => {
      active = false;
      window.removeEventListener(ALERT_SIGNALS_CHANGED_EVENT, handleSignalsChanged);
    };
  }, [isAuthenticated, loading, location.pathname]);

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
        <div
          className={macroMenuOpen ? 'skyweb-nav-dropdown open' : 'skyweb-nav-dropdown'}
          onBlur={handleMacroBlur}
          onKeyDown={handleMacroKeyDown}
          onMouseEnter={openMacroMenu}
          onMouseLeave={closeMacroMenu}
          ref={macroDropdownRef}
        >
          <button
            aria-expanded={macroMenuOpen}
            className={
              macroActive
                ? 'skyweb-nav-link skyweb-nav-dropdown-trigger active'
                : 'skyweb-nav-link skyweb-nav-dropdown-trigger'
            }
            onClick={() => setMacroMenuOpen((isOpen) => !isOpen)}
            onFocus={openMacroMenu}
            type="button"
          >
            Macro
            <span aria-hidden="true" className="skyweb-nav-caret">
              ▾
            </span>
          </button>
          <div className="skyweb-nav-menu" role="menu">
            <NavLink
              className={getNavLinkClass}
              end
              onClick={closeMacroMenu}
              role="menuitem"
              to="/macro"
            >
              Overview
            </NavLink>
            {!loading && isAuthenticated && (
              <>
                <NavLink
                  className={getNavLinkClass}
                  onClick={closeMacroMenu}
                  role="menuitem"
                  to="/dashboard"
                >
                  Dashboard
                </NavLink>
                <NavLink
                  className={getNavLinkClass}
                  onClick={closeMacroMenu}
                  role="menuitem"
                  to="/macro/alerts"
                >
                  <span>Alerts</span>
                  {openSignalCount > 0 && (
                    <span className="skyweb-nav-signal-badge">{openSignalCount}</span>
                  )}
                </NavLink>
                <NavLink
                  className={getNavLinkClass}
                  onClick={closeMacroMenu}
                  role="menuitem"
                  to="/macro/alerts/preferences"
                >
                  Alert preferences
                </NavLink>
              </>
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
            {openSignalCount > 0 && (
              <NavLink className="skyweb-global-signal-pill" to="/macro/alerts">
                <span>Signals</span>
                <strong>{openSignalCount}</strong>
              </NavLink>
            )}
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
