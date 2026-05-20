// ============================================================
// Authority Store — Phase 2
// Manages authority dashboard state, complaint queue,
// and road health data using Zustand.
// ============================================================
import { create } from 'zustand';
import api from '../services/api';

const useAuthorityStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  dashboard: null,
  complaints: [],
  pagination: { total: 0, page: 1, limit: 20, pages: 1 },
  roadHealth: [],
  authorityAreas: [],
  selectedComplaint: null,
  filters: {
    status: '', severity: '', issue_type: '', authority_area_id: '',
    sort: 'created_at', order: 'DESC',
  },
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────

  // Fetch authority dashboard overview
  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/authority/dashboard');
      set({ dashboard: res.data.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load dashboard', loading: false });
    }
  },

  // Fetch complaint queue with filters
  fetchComplaints: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = { page, limit: 20, ...filters };
      // Remove empty params
      Object.keys(params).forEach(k => params[k] === '' && delete params[k]);
      const res = await api.get('/authority/complaints', { params });
      set({
        complaints: res.data.data.complaints,
        pagination: res.data.data.pagination,
        loading: false,
      });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load complaints', loading: false });
    }
  },

  // Set filters and refetch
  setFilters: (newFilters) => {
    set(state => ({ filters: { ...state.filters, ...newFilters } }));
    get().fetchComplaints(1);
  },

  // Assign complaint to officer/contractor
  assignComplaint: async (complaintId, assignData) => {
    set({ loading: true, error: null });
    try {
      await api.patch(`/authority/complaints/${complaintId}/assign`, assignData);
      set({ loading: false });
      // Refresh list
      await get().fetchComplaints(get().pagination.page);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Assignment failed';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Escalate complaint
  escalateComplaint: async (complaintId, reason) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/authority/complaints/${complaintId}/escalate`, { reason });
      set({ loading: false });
      await get().fetchComplaints(get().pagination.page);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Escalation failed';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Resolve complaint with image
  resolveComplaint: async (complaintId, formData) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/authority/complaints/${complaintId}/resolve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ loading: false });
      await get().fetchComplaints(get().pagination.page);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Resolution failed';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Fetch road health data
  fetchRoadHealth: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/authority/road-health');
      set({ roadHealth: res.data.data.roads, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load road health', loading: false });
    }
  },

  // Fetch authority areas
  fetchAuthorityAreas: async () => {
    try {
      const res = await api.get('/authority/areas');
      set({ authorityAreas: res.data.data.areas });
    } catch (err) {
      console.error('Failed to fetch authority areas:', err.message);
    }
  },

  // Trigger road health recompute
  recomputeRoadHealth: async () => {
    try {
      await api.post('/authority/road-health/recompute');
      await get().fetchRoadHealth();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Recompute failed' };
    }
  },

  // Select/deselect a complaint
  setSelectedComplaint: (complaint) => set({ selectedComplaint: complaint }),

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthorityStore;
