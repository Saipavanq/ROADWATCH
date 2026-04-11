import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar        from './components/Navbar';
import LoginPage     from './pages/LoginPage';
import ReportPage    from './pages/ReportPage';
import StatusPage    from './pages/StatusPage';
import MapPage       from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import useAuthStore  from './store/authStore';

// Protected route wrapper
function Protected({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

// Home — redirect based on auth
function Home() {
  const { isAuthenticated } = useAuthStore();
  return <Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/map"       element={<MapPage />} />

        {/* Auth-gated routes */}
        <Route path="/report"    element={<Protected><ReportPage /></Protected>} />
        <Route path="/status"    element={<Protected><StatusPage /></Protected>} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/complaint/:id" element={<Protected><StatusPage /></Protected>} />

        {/* Authority route removed to separate frontend */}

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
