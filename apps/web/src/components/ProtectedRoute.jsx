import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from './PageState.jsx';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingState>Checking SkyWeb session...</LoadingState>;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
