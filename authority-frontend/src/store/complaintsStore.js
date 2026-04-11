import { create } from 'zustand';
import api from '../services/api';

const useComplaintsStore = create((set, get) => ({
  complaints: [],
  currentComplaint: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: { total: 0, page: 1, limit: 20, pages: 1 },
  filters: { status: '', severity: '', issue_type: '', my: false },

  // ── Fetch list ──────────────────────────────────────────────
  fetchComplaints: async (overrideFilters = {}) => {
    set({ isLoading: true, error: null });
    const { filters, pagination } = get();
    const merged = { ...filters, ...overrideFilters };
    const params = new URLSearchParams();
    if (merged.status)     params.append('status', merged.status);
    if (merged.severity)   params.append('severity', merged.severity);
    if (merged.issue_type) params.append('issue_type', merged.issue_type);
    if (merged.my)         params.append('my', 'true');
    params.append('page', pagination.page);
    params.append('limit', pagination.limit);

    try {
      const { data } = await api.get(`/complaints?${params.toString()}`);
      set({
        complaints: data.data.complaints,
        pagination: data.data.pagination,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch complaints', isLoading: false });
    }
  },

  // ── Fetch single ────────────────────────────────────────────
  fetchComplaint: async (id) => {
    set({ isLoading: true, error: null, currentComplaint: null });
    try {
      const { data } = await api.get(`/complaints/${id}`);
      set({ currentComplaint: data.data.complaint, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Complaint not found', isLoading: false });
    }
  },

  // ── Submit new ──────────────────────────────────────────────
  submitComplaint: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ isLoading: false });
      return { success: true, data: data.data, isDuplicate: data.isDuplicate };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit complaint';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  // ── Analyze image ────────────────────────────────────────────
  analyzeImage: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/issues/analyze', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { success: true, analysis: data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Analysis failed' };
    }
  },

  // ── Fetch stats ──────────────────────────────────────────────
  fetchStats: async () => {
    try {
      const { data } = await api.get('/complaints/stats');
      set({ stats: data.data });
    } catch (_) {}
  },

  // ── Upvote ──────────────────────────────────────────────────
  upvote: async (id) => {
    try {
      await api.post(`/complaints/${id}/upvote`);
      set((state) => ({
        complaints: state.complaints.map((c) =>
          c.id === id ? { ...c, upvotes: (c.upvotes || 0) + 1 } : c
        ),
      }));
    } catch (_) {}
  },

  // ── Filters ──────────────────────────────────────────────────
  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value }, pagination: { ...state.pagination, page: 1 } }));
  },
  clearFilters: () => {
    set({ filters: { status: '', severity: '', issue_type: '', my: false }, pagination: { total: 0, page: 1, limit: 20, pages: 1 } });
  },
  setPage: (page) => set((state) => ({ pagination: { ...state.pagination, page } })),
}));

export default useComplaintsStore;
