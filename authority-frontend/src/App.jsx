import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar        from './components/Navbar';
import LoginPage     from './pages/LoginPage';
import AuthorityPage from './pages/AuthorityPage';
import useAuthStore  from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';

// Protected route wrapper
function Protected({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function Home() {
  const { isAuthenticated } = useAuthStore();
  return <Navigate to={isAuthenticated() ? '/authority' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Navbar />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/login"     element={<LoginPage />} />
          {/* Auth-gated routes removed */}

          {/* Authority / Admin dashboard */}
          <Route path="/authority" element={<Protected><AuthorityPage /></Protected>} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
