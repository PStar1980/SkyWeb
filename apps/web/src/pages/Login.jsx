import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authNotice, clearAuthNotice, isAuthenticated, loading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname || '/account';

  useEffect(() => {
    return () => {
      clearAuthNotice();
    };
  }, [clearAuthNotice]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    clearAuthNotice();
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectPath, { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && isAuthenticated) {
    return <Navigate replace to="/account" />;
  }

  return (
    <section className="skyweb-auth-shell">
      <div className="skyweb-page-card skyweb-auth-card">
        <div className="skyweb-kicker">SkyWeb access</div>
        <h1>Sign in</h1>
        <p>
          Use your SkyWeb-enabled account to unlock the member layer for saved dashboards,
          preferences, and future macro alerts. Public macro dashboards remain available without
          signing in.
        </p>

        {(authNotice || error) && (
          <div className="skyweb-auth-alert" role="alert">
            {error || authNotice}
          </div>
        )}

        <form className="skyweb-auth-form" onSubmit={handleSubmit}>
          <label htmlFor="skyweb-login-email">Email</label>
          <input
            autoComplete="email"
            autoFocus
            className="form-control"
            id="skyweb-login-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />

          <label htmlFor="skyweb-login-password">Password</label>
          <input
            autoComplete="current-password"
            className="form-control"
            id="skyweb-login-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••••"
            required
            type="password"
            value={password}
          />

          <button className="btn skyweb-btn-primary" disabled={submitting} type="submit">
            {submitting ? 'Opening SkyWeb...' : 'Login'}
          </button>
        </form>

        <div className="skyweb-auth-footer">
          <Link className="skyweb-card-link" to="/macro">
            Continue to public macro dashboard →
          </Link>
        </div>
      </div>
    </section>
  );
}
