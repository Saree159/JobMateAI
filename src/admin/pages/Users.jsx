import React from 'react';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import { useAdminStats, useAdminUsersList } from '../useAdminStats';
import { spark7 } from '../mockData';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Users, UserPlus, Calendar, Zap, Star } from 'lucide-react';

const TT = { contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 } };
const AXIS = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false };

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

const TIER_COLORS = { free: '#334155', pro: '#22c55e' };

export default function UsersPage() {
  const { stats, loading } = useAdminStats();
  const { users, loading: usersLoading } = useAdminUsersList(20);

  const u = stats?.users ?? {};
  const monthlySignups = u.monthly_signups ?? [];
  const activationRate = u.total > 0 ? ((u.with_skills / u.total) * 100).toFixed(1) : 0;
  const paidConversion = u.total > 0 ? ((u.pro / u.total) * 100).toFixed(1) : 0;

  // Build role distribution from real users list
  const roleCounts = {};
  users.forEach(u => {
    if (u.target_role) {
      roleCounts[u.target_role] = (roleCounts[u.target_role] || 0) + 1;
    }
  });
  const roleData = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({
      name,
      value,
      color: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#64748b'][i],
    }));

  // Tier distribution
  const tierData = [
    { name: 'Free', value: u.free ?? 0, color: '#334155' },
    { name: 'Pro', value: u.pro ?? 0, color: '#22c55e' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-gray-400 text-sm mt-1">Real user data from your database</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="New Today" value={u.new_today ?? 0} icon={UserPlus} accent="#3b82f6" sparkData={spark7(u.new_today ?? 0, 3)} />
            <KPICard title="New This Week" value={u.new_week ?? 0} icon={Calendar} accent="#22c55e" sparkData={spark7(u.new_week ?? 0, 10)} />
            <KPICard title="New This Month" value={u.new_month ?? 0} icon={Users} accent="#a855f7" sparkData={spark7(u.new_month ?? 0, 20)} />
            <KPICard title="Profile Completion" value={parseFloat(activationRate)} format="percent" icon={Zap} accent="#f59e0b" sparkData={spark7(parseFloat(activationRate), 5)} />
            <KPICard title="Free-to-Paid" value={parseFloat(paidConversion)} format="percent" icon={Star} accent="#ec4899" sparkData={spark7(parseFloat(paidConversion), 1)} />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-5 md:col-span-3">
          <ChartCard title="Monthly Signups" subtitle="New user registrations per month">
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySignups}>
                  <defs>
                    <linearGradient id="sgGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" {...AXIS} />
                  <YAxis {...AXIS} />
                  <Tooltip {...TT} formatter={v => [v, 'New Users']} />
                  <Area type="monotone" dataKey="signups" stroke="#3b82f6" fill="url(#sgGrad2)" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="col-span-5 md:col-span-2">
          <ChartCard title="Plan Distribution" subtitle="Free vs Pro users">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {tierData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...TT} formatter={(v, name) => [v.toLocaleString(), name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {tierData.map(t => (
                <div key={t.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-gray-400">{t.name}</span>
                  <span className="text-white font-semibold">{t.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Target role distribution */}
      {roleData.length > 0 && (
        <ChartCard title="Target Roles" subtitle="What users are looking for (from profiles)">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData} layout="vertical" margin={{ left: 120, right: 24, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip {...TT} formatter={v => [v, 'Users']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {roleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Recent users table */}
      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white">Recent Signups</p>
          <p className="text-xs text-gray-500 mt-0.5">Last {users.length} registered users</p>
        </div>
        <div className="overflow-x-auto">
          {usersLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No users yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left px-5 py-3 font-medium">Name / Email</th>
                  <th className="text-left px-4 py-3 font-medium">Target Role</th>
                  <th className="text-center px-4 py-3 font-medium">Plan</th>
                  <th className="text-right px-4 py-3 font-medium">Skills</th>
                  <th className="text-right px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{u.target_role || '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.subscription_tier === 'pro' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'}`}>
                        {u.subscription_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-300">{u.skills_count}</td>
                    <td className="px-5 py-3.5 text-right text-gray-500 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
