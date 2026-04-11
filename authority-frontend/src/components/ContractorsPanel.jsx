import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CheckCircle, Clock } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function ContractorsPanel() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/contractors`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setContractors(res.data.data);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return <div className="spinner spinner-md mx-auto" />;

  return (
    <div className="space-y-4 animate-fadeIn">
      <h3>Active Contractors</h3>
      <div className="grid-cards">
        {contractors.map(c => (
          <div key={c.id} className="card">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="m-0">{c.name}</h4>
                  <span className="badge badge-success mt-2">⭐ {c.rating} / 5.0</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <div className="space-y-2 mt-4 text-sm text-secondary">
                <div className="flex justify-between">
                  <span>Licence:</span>
                  <span className="text-primary font-mono">{c.license_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><Clock size={14}/> Total Assigned:</span>
                  <span>{c.total_jobs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><CheckCircle size={14} className="text-success"/> Completed:</span>
                  <span>{c.completed_jobs}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <button className="btn btn-ghost btn-sm btn-full">View History</button>
              </div>
            </div>
          </div>
        ))}
        {contractors.length === 0 && <p className="text-muted p-4">No contractors registered.</p>}
      </div>
    </div>
  );
}
