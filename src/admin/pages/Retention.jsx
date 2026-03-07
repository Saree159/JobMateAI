import React from 'react';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Users, TrendingUp, Calendar, Clock } from 'lucide-react';
import { useAdminStats } from '../useAdminStats';

const GRID = { stroke: '#1e293b', strokeDasharray: '3 3' };
const AXIS = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false };
const TT = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 12,
  },
};
const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  amber: '#f59e0b',
  gray: '#64748b',
};

function getCellStyle(value) {
  if (value === null) return 'bg-white/5 text-gray-600';
  if (value >= 70) return 'bg-green-900/60 text-green-300';
  if (value >= 50) return 'bg-blue-900/60 text-blue-300';
  if (value >= 30) return 'bg-yellow-900/60 text-yellow-300';
  return 'bg-red-900/60 text-red-300';
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

export default function RetentionPage() {
  const { stats, loading } = useAdminStats();
  const r = stats?.retention ?? {};

  const dau = r.dau ?? 0;
  const wau = r.wau ?? 0;
  const mau = r.mau ?? 0;
  const trend = r.trend ?? [];
  const cohorts = r.cohorts ?? [];

  // Latest cohort with D1 data for KPIs
  const latestWithD1 = [...cohorts].reverse().find(c => c.d1 !== null);
  const latestWithD7 = [...cohorts].reverse().find(c => c.d7 !== null);
  const latestWithD30 = [...cohorts].reverse().find(c => c.d30 !== null);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Retention</h1>
        <p className="text-gray-400 text-sm mt-1">Login-based DAU/WAU/MAU and cohort retention — real data</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="DAU (today)" value={dau} format="number" icon={Users} accent={COLORS.green} />
            <KPICard title="WAU (7 days)" value={wau} format="number" icon={Calendar} accent={COLORS.blue} />
            <KPICard title="MAU (30 days)" value={mau} format="number" icon={TrendingUp} accent={COLORS.purple} />
            <KPICard
              title="D1 Retention"
              value={latestWithD1?.d1 ?? 0}
              format="percent"
              icon={Clock}
              accent={COLORS.amber}
            />
          </>
        )}
      </div>

      {/* DAU / WAU / MAU trend */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-5 md:col-span-3">
          <ChartCard title="DAU / WAU / MAU Trend" subtitle="Monthly active user counts from login sessions">
            {loading ? <Skeleton className="h-[240px]" /> : trend.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">
                No login sessions recorded yet. Sessions are logged on each user login.
              </div>
            ) : (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="month" {...AXIS} />
                    <YAxis
                      {...AXIS}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                    />
                    <Tooltip
                      {...TT}
                      formatter={(v, name) => [
                        v.toLocaleString(),
                        name === 'dau' ? 'DAU' : name === 'wau' ? 'WAU' : 'MAU',
                      ]}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>
                          {value === 'dau' ? 'DAU' : value === 'wau' ? 'WAU' : 'MAU'}
                        </span>
                      )}
                    />
                    <Line type="monotone" dataKey="dau" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wau" stroke={COLORS.amber} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mau" stroke={COLORS.green} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Stickiness ratio */}
        <div className="col-span-5 md:col-span-2">
          <ChartCard title="Stickiness Ratios" subtitle="DAU/MAU and WAU/MAU from real sessions">
            {loading ? <Skeleton className="h-[240px]" /> : (
              <div className="space-y-4 py-4">
                {[
                  { label: 'DAU / MAU (daily stickiness)', value: mau > 0 ? ((dau / mau) * 100).toFixed(1) : 0, color: COLORS.blue },
                  { label: 'WAU / MAU (weekly stickiness)', value: mau > 0 ? ((wau / mau) * 100).toFixed(1) : 0, color: COLORS.amber },
                  { label: 'D1 Retention', value: latestWithD1?.d1 ?? 0, color: COLORS.green },
                  { label: 'D7 Retention', value: latestWithD7?.d7 ?? 0, color: COLORS.purple },
                  { label: 'D30 Retention', value: latestWithD30?.d30 ?? 0, color: COLORS.amber },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-semibold" style={{ color }}>{value}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(parseFloat(value), 100)}%`, background: color }}
                      />
                    </div>
                  </div>
                ))}
                {mau === 0 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Ratios will populate as users log in
                  </p>
                )}
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Cohort Retention Heatmap */}
      <ChartCard title="Cohort Retention Heatmap" subtitle="% of signup cohort who logged in at D1 / D7 / D30">
        {loading ? <Skeleton className="h-[260px]" /> : cohorts.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">
            No cohort data yet
          </div>
        ) : (
          <>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 pr-6 text-xs text-gray-500 uppercase tracking-wider font-medium">Cohort</th>
                    <th className="text-center py-2 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Size</th>
                    {['Day 1', 'Day 7', 'Day 30'].map(label => (
                      <th key={label} className="text-center py-2 px-6 text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((row) => (
                    <tr key={row.cohort} className="border-b border-white/5">
                      <td className="py-3 pr-6 text-white font-medium text-sm whitespace-nowrap">{row.cohort}</td>
                      <td className="py-2 px-4 text-center text-gray-400 text-xs">{row.size}</td>
                      {[row.d1, row.d7, row.d30].map((val, j) => (
                        <td key={j} className="py-2 px-4 text-center">
                          <span
                            className={`inline-block px-4 py-1.5 rounded-lg text-xs font-bold ${getCellStyle(val)}`}
                            style={{ minWidth: 52 }}
                          >
                            {val !== null ? `${val}%` : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Legend:</span>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-900/60" /><span className="text-green-400">≥ 70%</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-900/60" /><span className="text-blue-400">50–69%</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-900/60" /><span className="text-yellow-400">30–49%</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-900/60" /><span className="text-red-400">&lt; 30%</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/5" /><span className="text-gray-600">— Not enough time has passed</span></div>
            </div>
          </>
        )}
      </ChartCard>
    </div>
  );
}
