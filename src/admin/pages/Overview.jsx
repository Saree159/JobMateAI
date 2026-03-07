import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Users, Activity, Star, DollarSign, TrendingUp, BarChart3, Briefcase, AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import { useAdminStats } from '../useAdminStats';
import { spark7 } from '../mockData';

const TT = { contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' } };
const AXIS = { fill: '#64748b', fontSize: 11 };

const PRO_PRICE = 89; // ₪ per month

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

export default function Overview() {
  const { stats, loading, error } = useAdminStats();

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 font-medium">Failed to load stats</p>
        <p className="text-gray-500 text-sm mt-1">{error}</p>
        <p className="text-gray-600 text-xs mt-2">Make sure the backend is running on port 8000</p>
      </div>
    );
  }

  const u = stats?.users ?? {};
  const j = stats?.jobs ?? {};
  const mrr = (u.pro ?? 0) * PRO_PRICE;
  const arr = mrr * 12;
  const freeToPaid = u.total > 0 ? ((u.pro / u.total) * 100).toFixed(1) : 0;

  const planDistribution = [
    { name: 'Free', value: u.free ?? 0, color: '#334155' },
    { name: 'Pro', value: u.pro ?? 0, color: '#22c55e' },
  ];

  const monthlySignups = u.monthly_signups ?? [];

  const keyMetrics = [
    { label: 'Total Users', value: loading ? '...' : (u.total ?? 0).toLocaleString() },
    { label: 'Pro Subscribers', value: loading ? '...' : (u.pro ?? 0).toLocaleString() },
    { label: 'Active Subscriptions', value: loading ? '...' : (u.active_subscriptions ?? 0).toLocaleString() },
    { label: 'Free-to-Paid Conv.', value: loading ? '...' : `${freeToPaid}%` },
    { label: 'Jobs Tracked', value: loading ? '...' : (j.total ?? 0).toLocaleString() },
    { label: 'Avg Match Score', value: loading ? '...' : `${j.avg_match_score ?? 0}%` },
    { label: 'Cover Letters Gen.', value: loading ? '...' : (j.with_cover_letter ?? 0).toLocaleString() },
    { label: 'Users with Profile', value: loading ? '...' : (u.with_skills ?? 0).toLocaleString() },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Business Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Live data from your database</p>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-semibold px-3 py-1">
              {(u.total ?? 0).toLocaleString()} Users
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-semibold px-3 py-1">
              {u.pro ?? 0} Pro · ₪{mrr.toLocaleString()} est. MRR
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-semibold px-3 py-1">
              {(j.total ?? 0).toLocaleString()} Jobs Tracked
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />)
        ) : (
          <>
            <KPICard title="Total Users" value={u.total ?? 0} icon={Users} accent="#3b82f6" sparkData={spark7(u.total ?? 0, 20)} />
            <KPICard title="Pro Subscribers" value={u.pro ?? 0} icon={Star} accent="#a855f7" sparkData={spark7(u.pro ?? 0, 5)} />
            <KPICard title="New This Month" value={u.new_month ?? 0} icon={Activity} accent="#22c55e" sparkData={spark7(u.new_month ?? 0, 10)} />
            <KPICard title="Est. MRR (₪)" value={mrr} format="number" icon={DollarSign} accent="#f59e0b" sparkData={spark7(mrr, 500)} />
            <KPICard title="Est. ARR (₪)" value={arr} format="k" icon={TrendingUp} accent="#3b82f6" sparkData={spark7(arr, 5000)} />
            <KPICard title="Jobs Tracked" value={j.total ?? 0} icon={Briefcase} accent="#f59e0b" sparkData={spark7(j.total ?? 0, 20)} />
            <KPICard title="Cover Letters" value={j.with_cover_letter ?? 0} icon={BarChart3} accent="#22c55e" sparkData={spark7(j.with_cover_letter ?? 0, 5)} />
            <KPICard title="Free-to-Paid" value={parseFloat(freeToPaid)} format="percent" icon={TrendingUp} accent="#ec4899" sparkData={spark7(parseFloat(freeToPaid), 1)} />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-5 md:col-span-3">
          <ChartCard title="Monthly Signups" subtitle="New user registrations per month">
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySignups}>
                  <defs>
                    <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} formatter={v => [v, 'Signups']} />
                  <Area type="monotone" dataKey="signups" stroke="#3b82f6" fill="url(#sgGrad)" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="col-span-5 md:col-span-2">
          <ChartCard title="Plan Mix" subtitle="Free vs Pro users">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" outerRadius={72} dataKey="value" labelLine={false}>
                    {planDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...TT} formatter={(v, name) => [v.toLocaleString(), name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 space-y-1 px-1">
              {planDistribution.map(entry => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-gray-400">{entry.name}</span>
                  </div>
                  <span className="text-white font-medium">{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Jobs by status bar */}
      <ChartCard title="Jobs by Status" subtitle="Application pipeline across all users">
        {loading ? <Skeleton className="h-[160px] w-full" /> : (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(j.by_status ?? {}).map(([k, v]) => ({ status: k, count: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="status" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip {...TT} formatter={v => [v, 'Jobs']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Key Metrics Summary */}
      <ChartCard title="Key Metrics Summary" subtitle="Core numbers from your live database">
        <div className="rounded-xl overflow-hidden border border-white/5">
          {keyMetrics.map((metric, i) => (
            <div key={metric.label} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}>
              <span className="text-sm text-gray-400">{metric.label}</span>
              <span className="text-sm font-semibold text-white">{metric.value}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
