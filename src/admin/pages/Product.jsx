import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import { featureEngagement, spark7 } from '../mockData';
import { useAdminStats } from '../useAdminStats';
import { Activity, Users, Zap, TrendingUp } from 'lucide-react';

const adoptionData = featureEngagement.map(f => ({ name: f.feature.replace('AI ', ''), adoption: f.adoption, usage: Math.round(f.weeklyUsage * 1000) }));

const weeklyActivity = [
  { day: 'Mon', matches: 4200, resumes: 980, apps: 640, digests: 6800 },
  { day: 'Tue', matches: 4580, resumes: 1040, apps: 720, digests: 6400 },
  { day: 'Wed', matches: 4100, resumes: 1120, apps: 680, digests: 6600 },
  { day: 'Thu', matches: 4800, resumes: 1200, apps: 780, digests: 7100 },
  { day: 'Fri', matches: 3900, resumes: 860, apps: 560, digests: 5800 },
  { day: 'Sat', matches: 2400, resumes: 480, apps: 320, digests: 3200 },
  { day: 'Sun', matches: 2100, resumes: 420, apps: 280, digests: 2800 },
];

const retentionImpactColor = { 'Very High': 'text-green-400', High: 'text-blue-400', Medium: 'text-yellow-400', Low: 'text-gray-400' };

export default function Product() {
  const { stats, loading } = useAdminStats();
  const j = stats?.jobs ?? {};
  const u = stats?.users ?? {};

  return (
    <div className="p-6 space-y-6 min-h-full">
      <div>
        <h2 className="text-xl font-bold text-white">Product Activity</h2>
        <p className="text-sm text-gray-400 mt-0.5">Feature adoption, engagement, and conversion impact</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Jobs Tracked" value={j.total ?? 0} format="number" icon={Activity} accent="#3b82f6" sparkData={spark7(j.total ?? 0, 20)} />
        <KPICard title="Cover Letters Gen." value={j.with_cover_letter ?? 0} format="number" icon={Zap} accent="#22c55e" sparkData={spark7(j.with_cover_letter ?? 0, 5)} />
        <KPICard title="Match Scores Run" value={j.with_match_score ?? 0} format="number" icon={TrendingUp} accent="#a855f7" sparkData={spark7(j.with_match_score ?? 0, 5)} />
        <KPICard title="Profile Completion" value={u.total > 0 ? parseFloat(((u.with_skills / u.total) * 100).toFixed(1)) : 0} format="percent" icon={Users} accent="#f59e0b" sparkData={spark7(60, 8)} />
      </div>

      {/* Weekly activity chart */}
      <ChartCard title="Weekly Feature Activity" subtitle="Action counts by day this week">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weeklyActivity} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="matches" stroke="#3b82f6" strokeWidth={2} dot={false} name="Job Matches" />
            <Line type="monotone" dataKey="resumes" stroke="#22c55e" strokeWidth={2} dot={false} name="Resumes" />
            <Line type="monotone" dataKey="apps" stroke="#a855f7" strokeWidth={2} dot={false} name="App Tracks" />
            <Line type="monotone" dataKey="digests" stroke="#f59e0b" strokeWidth={2} dot={false} name="Digests Sent" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Feature adoption bar */}
      <ChartCard title="Feature Adoption Rate" subtitle="% of activated users who used each feature">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={adoptionData} layout="vertical" margin={{ top: 4, right: 24, left: 120, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} formatter={v => [`${v}%`, 'Adoption']} />
            <Bar dataKey="adoption" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Feature engagement table */}
      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white">Feature Engagement Details</p>
          <p className="text-xs text-gray-500 mt-0.5">Adoption, weekly usage, and conversion impact</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5">
                <th className="text-left px-5 py-3 font-medium">Feature</th>
                <th className="text-right px-4 py-3 font-medium">Adoption</th>
                <th className="text-right px-4 py-3 font-medium">Weekly Uses/User</th>
                <th className="text-center px-4 py-3 font-medium">Retention Impact</th>
                <th className="text-right px-4 py-3 font-medium">Paid Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {featureEngagement.map((row) => (
                <tr key={row.feature} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-white">{row.feature}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.adoption}%` }} />
                      </div>
                      <span className="text-white w-10 text-right">{row.adoption}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-300">{row.weeklyUsage}x</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-medium ${retentionImpactColor[row.retentionImpact]}`}>{row.retentionImpact}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-green-400 font-medium">{row.paidConversion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
