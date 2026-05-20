import { useState } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [step, setStep] = useState('initial'); // 'initial' | 'otp'
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const requestDeleteOtp = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/auth/delete-otp');
      setMessage(data.message || 'OTP sent to your email.');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await api.delete('/auth/delete-account', { data: { otp } });
      logout();
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account.');
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page-wrapper">
      <div className="container settings-container">
        <h1>Settings</h1>
        <p className="text-muted">Manage your RoadWatch account</p>

        <div className="card mt-6 border-danger">
          <div className="card-header danger-header">
            <h3><AlertTriangle size={20} /> Danger Zone</h3>
            <p className="text-sm">Irreversible actions for your account</p>
          </div>
          <div className="card-body">
            <h4 className="text-danger mb-2">Delete Account</h4>
            <p className="text-muted mb-4">
              Once you delete your account, there is no going back. All your data, reports, and settings will be permanently removed.
            </p>

            {error && <div className="error-alert mb-4">{error}</div>}
            {message && <div className="success-alert mb-4">{message}</div>}

            {step === 'initial' && (
              <button 
                className="btn btn-danger" 
                onClick={requestDeleteOtp} 
                disabled={isLoading}
              >
                {isLoading ? 'Requesting...' : 'Request Account Deletion'}
              </button>
            )}

            {step === 'otp' && (
              <div className="otp-verification-box">
                <p className="mb-2">Enter the OTP sent to <strong>{user.email}</strong> to confirm deletion.</p>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="form-input text-center"
                  style={{ letterSpacing: '8px', fontSize: '1.5rem' }}
                />
                <div className="flex gap-4 mt-4">
                  <button 
                    className="btn btn-outline" 
                    onClick={() => { setStep('initial'); setOtp(''); setError(''); setMessage(''); }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDeleteAccount} 
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
