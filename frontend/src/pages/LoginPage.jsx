import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import './LoginPage.css';

export default function LoginPage() {
  const [tab, setTab]           = useState('login'); // 'login' | 'register'
  const [showPass, setShowPass]  = useState(false);
  const [form, setForm]          = useState({ name: '', email: '', password: '', phone: '' });
  const { login, register, guestLogin, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    if (tab === 'login') {
      result = await login(form.email, form.password);
    } else {
      result = await register(form.name, form.email, form.password, form.phone);
    }
    if (result.success) navigate('/');
  };

  const handleGuest = async () => {
    const result = await guestLogin();
    if (result.success) navigate('/');
  };

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-page__hero">
        <div className="login-page__hero-content">
          <div className="login-page__logo">
            <MapPin size={28} />
          </div>
          <h1 className="login-page__hero-title">
            Better Roads<br />
            <span className="text-primary">Start With You</span>
          </h1>
          <p className="login-page__hero-sub">
            Report road issues in seconds. AI analyzes severity. 
            Authorities act. You track progress — all in one app.
          </p>
          <div className="login-page__stats">
            {[['12K+','Issues Reported'],['4.8K','Resolved'],['98%','Response Rate']].map(([val, label]) => (
              <div key={label} className="login-page__stat">
                <span className="login-page__stat-val">{val}</span>
                <span className="login-page__stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="login-page__hero-bg" aria-hidden="true">
          <div className="login-page__orb login-page__orb--1" />
          <div className="login-page__orb login-page__orb--2" />
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="login-page__form-panel">
        <div className="login-page__card card animate-fadeInUp">
          {/* Tabs */}
          <div className="login-page__tabs">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                className={`login-page__tab ${tab === t ? 'active' : ''}`}
                onClick={() => { setTab(t); clearError(); }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit} className="login-page__form">
              {/* Name (register only) */}
              {tab === 'register' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="login-page__input-wrap">
                    <User size={16} className="login-page__input-icon" />
                    <input
                      id="name" name="name" type="text" required
                      className="form-input login-page__input"
                      placeholder="Your full name"
                      value={form.name} onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="login-page__input-wrap">
                  <Mail size={16} className="login-page__input-icon" />
                  <input
                    id="email" name="email" type="email" required
                    className="form-input login-page__input"
                    placeholder="you@email.com"
                    value={form.email} onChange={handleChange}
                  />
                </div>
              </div>

              {/* Phone (register only) */}
              {tab === 'register' && (
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <div className="login-page__input-wrap">
                    <Phone size={16} className="login-page__input-icon" />
                    <input
                      id="phone" name="phone" type="tel"
                      className="form-input login-page__input"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.phone} onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="login-page__input-wrap">
                  <Lock size={16} className="login-page__input-icon" />
                  <input
                    id="password" name="password"
                    type={showPass ? 'text' : 'password'} required
                    className="form-input login-page__input"
                    placeholder={tab === 'register' ? 'Min. 8 characters' : 'Your password'}
                    value={form.password} onChange={handleChange}
                  />
                  <button type="button" className="login-page__pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="login-page__error animate-fadeIn">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading}>
                {isLoading ? <div className="spinner spinner-sm" /> : null}
                {tab === 'login' ? 'Sign In' : 'Create Account'}
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="login-page__divider">
              <hr /> <span>or</span> <hr />
            </div>

            {/* Guest */}
            <button className="btn btn-secondary btn-full" onClick={handleGuest} disabled={isLoading}>
              <Zap size={16} />
              Continue as Guest
            </button>

            <p className="login-page__guest-note">
              Guest accounts can submit reports without registration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
