import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import AnimatedRoadScene from '../components/AnimatedRoadScene';
import './LoginPage.css';

export default function LoginPage() {
  const [tab, setTab]           = useState('login'); // 'login' | 'register'
  const [showPass, setShowPass]  = useState(false);
  const [form, setForm]          = useState({ name: '', email: '', password: '', phone: '' });
  const [otp, setOtp]            = useState('');
  
  const { 
    login, register, guestLogin, 
    verifyOtp, awaitingOtp, tempUserId, cancelOtp,
    isLoading, error, clearError 
  } = useAuthStore();
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
    // If successful and no OTP needed directly (fallback)
    if (result.success) navigate('/');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const result = await verifyOtp(tempUserId, otp);
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
        <AnimatedRoadScene />
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

          <div className="login-page__role-switch">
             <a href="http://localhost:5173/login" className="role-link">
               <span className="role-text">Are you a Citizen?</span>
               <span className="role-action">Go to Citizen Portal &rarr;</span>
             </a>
          </div>

          <div className="card-body">
            {awaitingOtp ? (
              <form onSubmit={handleVerifyOtp} className="login-page__form animate-fadeIn">
                <h3 style={{color: 'white', marginBottom: '10px'}}>Verify Email / Phone</h3>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px'}}>
                  Please enter the 6-digit OTP code sent to you. check console output in dev!
                </p>
                <div className="form-group">
                  <div className="login-page__input-wrap">
                    <Lock size={16} className="login-page__input-icon" />
                    <input
                      id="otp" name="otp" type="text" maxLength="6" required
                      className="form-input login-page__input"
                      placeholder="6-digit code"
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      style={{ letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center' }}
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-page__error animate-fadeIn">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading || otp.length < 6}>
                  {isLoading ? <div className="spinner spinner-sm" /> : null}
                  Verify OTP
                  {!isLoading && <ArrowRight size={16} />}
                </button>

                <button type="button" className="btn btn-secondary btn-full" onClick={cancelOtp} style={{marginTop: '10px'}}>
                  Cancel
                </button>
              </form>
            ) : (
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
            )}

            {!awaitingOtp && (
              <>
                <div className="login-page__divider">
                  <hr /> <span>or</span> <hr />
                </div>

                <button className="btn btn-secondary btn-full" onClick={handleGuest} disabled={isLoading}>
                  <Zap size={16} />
                  Continue as Guest
                </button>

                <p className="login-page__guest-note">
                  Guest accounts can submit reports without registration
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
