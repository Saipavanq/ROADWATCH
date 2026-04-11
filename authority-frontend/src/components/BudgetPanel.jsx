import { useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import useAuthStore from '../store/authStore';

export default function BudgetPanel() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/budget`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setBudgets(res.data.data);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return <div className="spinner spinner-md mx-auto" />;
  if (!budgets.length) return <div className="text-center p-8 text-muted">No budget data allocated yet.</div>;

  const data = budgets.map(b => ({
    name: b.authority_name,
    Allocated: parseFloat(b.allocated_amount),
    Spent: parseFloat(b.spent_amount),
    Remaining: parseFloat(b.allocated_amount) - parseFloat(b.spent_amount)
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid-cards">
        <div className="card">
          <div className="card-body flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary uppercase font-bold tracking-widest mb-1">Total Allocated</p>
              <h2 className="text-3xl font-black">
                ₹{data.reduce((a, b) => a + b.Allocated, 0).toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary uppercase font-bold tracking-widest mb-1">Total Spent</p>
              <h2 className="text-3xl font-black">
                ₹{data.reduce((a, b) => a + b.Spent, 0).toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-danger/20 text-danger flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="card h-96">
        <div className="card-body flex flex-col h-full">
          <h3 className="mb-4">Budget Burndown (FY 2024-25)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ background: '#1c1f28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Allocated" fill="var(--primary)" radius={[4,4,0,0]} />
                <Bar dataKey="Spent" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
