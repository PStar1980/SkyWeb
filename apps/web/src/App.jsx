import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import MacroOverview from './pages/MacroOverview.jsx';
import MacroViews from './pages/MacroViews.jsx';
import MacroViewDetail from './pages/MacroViewDetail.jsx';
import MacroIndicators from './pages/MacroIndicators.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="skyweb-app">
        <Navbar />
        <main className="skyweb-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/macro" element={<MacroOverview />} />
            <Route path="/macro/views" element={<MacroViews />} />
            <Route path="/macro/views/:viewKey" element={<MacroViewDetail />} />
            <Route path="/macro/indicators" element={<MacroIndicators />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
