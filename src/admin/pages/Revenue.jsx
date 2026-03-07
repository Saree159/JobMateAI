import React from 'react';
import { DollarSign, TrendingUp, Users, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import { useAdminStats } from '../useAdminStats';
import { spark7 } from '../mockData';

const TT = { contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' } };
const PRO_PRICE = 89;

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

export default function Revenue() {
  const { stats, loading, error } = useAdminStats();
  const u = stats?.users ?? {};
  const proCount = u.pro ?? 0;
  const freeCount = u.free ?? 0;
  const activeSubCount = u.active_subscriptions ?? 0;
  const mrr = proCount * PRO_PRICE;
  const arr = mrr * 12;
  const arpu = u.total > 0 ? (mrr / u.total).toFixed(2) : 0;
  const freeToPaid = u.total > 0 ? ((proCount / u.total) * 100).toFixed(1) : 0;

  const planData = [
    { name: 'Free', value: freeCount, color: '#334155' },
    { name: 'Pro', value: proCount, color: '#22c55e' },
  ];

  const revenueTable = [
    { metric: 'Pro Subscribers', value: proCount.toLocaleString() },
    { metric: 'Active Subscriptions', value: activeSubCount.toLocaleString() },
    { metric: 'Est. MRR (₪89/user)', value: `₪${mrr.toLocaleString()}` },
    { metric: 'Est. ARR', value: `₪${arr.toLocaleString()}` },
    { metric: 'ARPU (all users)', value: `₪${arpu}` },
    { metric: 'ARPPU (paid only)', value: `₪${PRO_PRICE}` },
    { metric: 'Free-to-Paid Rate', value: `${freeToPaid}%` },
    { metric: 'Total Users', value: (u.total ?? 0).toLocaleString() },
  ];

  if (error) return <div className="p-8 text-center text-red-400">Failed to load data: {error}</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Revenue Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Live subscription data · Pro plan: ₪89/month</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="Est. MRR (₪)" value={mrr} format="number" icon={DollarSign} accent="#3b82f6" sparkData={spark7(mrr, 500)} />
            <KPICard title="Est. ARR (₪)" value={arr} format="k" icon={TrendingUp} accent="#22c55e" sparkData={spark7(arr, 5000)} />
            <KPICard title="Pro Subscribers" value={proCount} icon={Star} accent="#a855f7" sparkData={spark7(proCount, 5)} />
            <KPICard title="Free-to-Paid" value={parseFloat(freeToPaid)} format="percent" icon={Users} accent="#f59e0b" sparkData={spark7(parseFloat(freeToPaid), 1)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Subscription Plan Distribution" subtitle="Free vs Pro users">
          {loading ? <Skeleton className="h-[280px]" /> : (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                      {planData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...TT} formatter={(v, name) => [v.toLocaleString(), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {planData.map(t => (
                  <div key={t.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="text-gray-400">{t.name}</span>
                    <span className="text-white font-semibold">{t.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Revenue Metrics" subtitle="Live estimates from database">
          {loading ? <Skeleton className="h-[280px]" /> : (
            <div className="rounded-xl overflow-hidden border border-white/5">
              {revenueTable.map((row, i) => (
                <div key={row.metric} className={`flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 ${i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}>
                  <span className="text-sm text-gray-400">{row.metric}</span>
                  <span className="text-sm font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        <strong>Note:</strong> MRR is estimated as Pro users × ₪89. For precise revenue reconciliation, connect PayPal webhook data. Historical MRR trends require time-series subscription event tracking.
      </div>
    </div>
  );
}
