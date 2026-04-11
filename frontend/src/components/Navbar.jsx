import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { MapPin, Bell, User, Menu, X, LogOut, ChevronDown, Zap } from 'lucide-react';
import useAuthStore from '../store/authStore';
import NotificationTray from './NotificationTray';
import './Navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [userMenuOpen, setUserMenu] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/map',       label: 'Live Map' },
    { to: '/report',    label: 'Report Issue' },
    { to: '/status',    label: 'My Reports' },
    { to: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <div className="navbar__logo-icon">
            <MapPin size={18} />
          </div>
          <span className="navbar__logo-text">
            Road<span className="navbar__logo-accent">Watch</span>
          </span>
        </Link>

        {/* Nav Links */}
        <ul className="navbar__links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className="navbar__actions">
          {isAuthenticated() ? (
            <>
              <NotificationTray />

              <div className="navbar__user-menu">
                <button
                  className="navbar__user-btn"
                  onClick={() => setUserMenu(!userMenuOpen)}
                >
                  <div className="navbar__avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="navbar__user-name">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`navbar__chevron ${userMenuOpen ? 'navbar__chevron--open' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="navbar__dropdown animate-fadeIn">
                    <div className="navbar__dropdown-header">
                      <p className="navbar__dropdown-name">{user?.name}</p>
                      <p className="navbar__dropdown-email">{user?.email}</p>
                      <span className={`badge badge-${user?.role || 'citizen'} text-xs`}>{user?.role}</span>
                    </div>
                    <div className="navbar__dropdown-divider" />
                    <button className="navbar__dropdown-item" onClick={handleLogout}>
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/login" className="btn btn-primary btn-sm">
                <Zap size={14} /> Get Started
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button className="navbar__hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar__mobile animate-fadeInUp">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="navbar__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          {!isAuthenticated() && (
            <Link to="/login" className="btn btn-primary btn-full" onClick={() => setMenuOpen(false)}>
              Sign In / Sign Up
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
