import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DashboardsProvider } from './context/DashboardsContext.jsx';
import { SavedViewsProvider } from './context/SavedViewsContext.jsx';
import {
  getDensityClassName,
  PreferencesProvider,
  usePreferences,
} from './context/PreferencesContext.jsx';
import Account from './pages/Account.jsx';
import Home from './pages/Home.jsx';
import MemberDashboard from './pages/MemberDashboard.jsx';
import DashboardBuilder from './pages/DashboardBuilder.jsx';
import DashboardViewer from './pages/DashboardViewer.jsx';
import Login from './pages/Login.jsx';
import MacroOverview from './pages/MacroOverview.jsx';
import MacroViews from './pages/MacroViews.jsx';
import MacroViewDetail from './pages/MacroViewDetail.jsx';
import MacroIndicators from './pages/MacroIndicators.jsx';
import './App.css';

function SkyWebShell() {
  const { preferences } = usePreferences();
  const location = useLocation();
  const densityClassName = getDensityClassName(preferences);
  const presentationMode = location.pathname.endsWith('/presentation');
  const appClassName = [
    'skyweb-app',
    densityClassName,
    presentationMode ? 'skyweb-presentation-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={appClassName}>
      <Navbar />
      <main className="skyweb-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/macro" element={<MacroOverview />} />
          <Route path="/macro/views" element={<MacroViews />} />
          <Route path="/macro/views/:viewKey" element={<MacroViewDetail />} />
          <Route path="/macro/indicators" element={<MacroIndicators />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboards"
            element={
              <ProtectedRoute>
                <DashboardBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboards/:dashboardKey"
            element={
              <ProtectedRoute>
                <DashboardViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboards/:dashboardKey/presentation"
            element={
              <ProtectedRoute>
                <DashboardViewer presentationMode />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <Navigate to="/macro/views?status=SAVED" replace />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <SavedViewsProvider>
            <DashboardsProvider>
              <SkyWebShell />
            </DashboardsProvider>
          </SavedViewsProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
