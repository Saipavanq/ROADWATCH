import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // ── Actions ──────────────────────────────────────────
      register: async (name, email, password, phone) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { name, email, password, phone });
          const { user, accessToken, refreshToken } = data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Registration failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      guestLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/guest');
          const { user, accessToken } = data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, accessToken, refreshToken: null, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Guest login failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      logout: async () => {
        try {
          const rt = get().refreshToken;
          if (rt) await api.post('/auth/logout', { refreshToken: rt });
        } catch (_) {}
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, refreshToken: null, error: null });
      },

      clearError: () => set({ error: null }),

      isAuthenticated: () => !!get().user && !!get().accessToken,
      isGuest: () => get().user?.is_guest === true,
    }),
    {
      name: 'roadwatch-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
