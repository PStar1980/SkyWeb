import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SavedViewsProvider } from './context/SavedViewsContext.jsx';
import {
  getDensityClassName,
  PreferencesProvider,
  usePreferences,
} from './context/PreferencesContext.jsx';
import Account from './pages/Account.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import MacroOverview from './pages/MacroOverview.jsx';
import MacroViews from './pages/MacroViews.jsx';
import MacroViewDetail from './pages/MacroViewDetail.jsx';
import MacroIndicators from './pages/MacroIndicators.jsx';
import SavedViews from './pages/SavedViews.jsx';
import './App.css';

function SkyWebShell() {
  const { preferences } = usePreferences();
  const densityClassName = getDensityClassName(preferences);

  return (
    <div className={`skyweb-app ${densityClassName}`}>
      <Navbar />
      <main className="skyweb-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/macro" element={<MacroOverview />} />
          <Route path="/macro/views" element={<MacroViews />} />
          <Route path="/macro/views/:viewKey" element={<MacroViewDetail />} />
          <Route path="/macro/indicators" element={<MacroIndicators />} />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedViews />
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
            <SkyWebShell />
          </SavedViewsProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
