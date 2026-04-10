import axios from 'axios';

// In development Vite proxies /api → http://localhost:5000/api.
// In production set VITE_API_URL=https://your-backend.com/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  withCredentials: true,
});

// Attach stored token on startup
const _stored = localStorage.getItem('roadwatch-auth');
if (_stored) {
  try {
    const { state } = JSON.parse(_stored);
    if (state?.accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
    }
  } catch (_) {}
}

// Response interceptor — auto-refresh access token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const _s = localStorage.getItem('roadwatch-auth');
        if (_s) {
          const { state } = JSON.parse(_s);
          if (state?.refreshToken) {
            const { data } = await axios.post(
              `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
              { refreshToken: state.refreshToken }
            );
            const newToken = data.data.accessToken;
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            original.headers['Authorization'] = `Bearer ${newToken}`;
            return api(original);
          }
        }
      } catch (_) {
        // Refresh failed — clear auth state
        localStorage.removeItem('roadwatch-auth');
        delete api.defaults.headers.common['Authorization'];
      }
    }
    return Promise.reject(error);
  }
);

export default api;
