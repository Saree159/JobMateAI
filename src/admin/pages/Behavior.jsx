import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { RefreshCw, MousePointerClick, Users, Activity, Eye } from 'lucide-react';
import ChartCard from '../components/ChartCard';

import { adminApi } from '@/api/admin';

const TT = { contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 } };
const AXIS = { fill: '#64748b', fontSize: 11 };

const EVENT_LABELS = {
  page_view:       'Page View',
  job_click:       'Job Click',
  job_save:        'Job Save',
  job_apply:       'Job Apply',
  refresh_matches: 'Refresh Matches',
  load_more:       'Load More',
  filter_change:   'Filter Change',
  profile_update:  'Profile Update',
  resume_upload:   'Resume Upload',
  search:          'Search',
};

function StatTile({ label, value, desc, icon: Icon, accent = '#3b82f6' }) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl p-5 flex items-start justify-between hover:border-white/10 transition-colors">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        {desc && <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">{desc}</p>}
      </div>
      <div className="p-2 rounded-xl bg-white/5">
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
    </div>
  );
}

export default function Behavior() {
  const [days, setDays] = useState(7);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['admin-behavior', days],
    queryFn: () => adminApi.getBehaviorSummary(days),
    staleTime: 60_000,
  });
  const { data: stream = [] } = useQuery({
    queryKey: ['admin-stream'],
    queryFn: () => adminApi.getBehaviorStream(60),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const { data: perUser = [] } = useQuery({
    queryKey: ['admin-per-user'],
    queryFn: () => adminApi.getBehaviorPerUser(30),
    staleTime: 60_000,
  });

  const eventChart = summary
    ? Object.entries(summary.by_event)
        .map(([k, v]) => ({ name: EVENT_LABELS[k] || k, count: v }))
        .sort((a, b) => b.count - a.count)
    : [];

  const pageChart = summary
    ? Object.entries(summary.by_page)
        .map(([k, v]) => ({ name: k, count: v }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">User Behavior</h1>
          <p className="text-gray-500 text-sm mt-0.5">What users actually do in the app</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Active Users"  value={summary?.active_users}               icon={Users}            accent="#3b82f6" desc="Unique users with at least one event in this period" />
        <StatTile label="Total Events"  value={summary?.total_events}               icon={Activity}         accent="#a855f7" desc="All tracked interactions — clicks, views, searches, saves" />
        <StatTile label="Job Clicks"    value={summary?.by_event?.job_click ?? 0}   icon={MousePointerClick} accent="#22c55e" desc="Times users opened a job listing to view its details" />
        <StatTile label="Page Views"    value={summary?.by_event?.page_view  ?? 0}  icon={Eye}              accent="#f97316" desc="Total page navigation events across all sections" />
      </div>

      {/* Daily trend */}
      <ChartCard title="Events per Day" subtitle={`Last ${days} days — daily volume of all user interactions`}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={summary?.daily || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={AXIS} />
            <YAxis tick={AXIS} />
            <Tooltip {...TT} />
            <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Event breakdown + Page breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Events by Action" subtitle="What users do most — sorted by total count">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventChart} layout="vertical">
              <XAxis type="number" tick={AXIS} />
              <YAxis dataKey="name" type="category" width={120} tick={AXIS} />
              <Tooltip {...TT} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Traffic by Page" subtitle="Which sections receive the most visits">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pageChart} layout="vertical">
              <XAxis type="number" tick={AXIS} />
              <YAxis dataKey="name" type="category" width={100} tick={AXIS} />
              <Tooltip {...TT} />
              <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Per-user table + Live stream */}
      <div className="grid lg:grid-cols-2 gap-4">

        <ChartCard title="Most Active Users" subtitle="Users with the highest event count in the last 30 days">
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-white/5">
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-right pb-2 font-medium">Events</th>
                  <th className="text-right pb-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {perUser.map(u => (
                  <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 text-gray-300 truncate max-w-[180px]">{u.email || `#${u.user_id}`}</td>
                    <td className="py-2 text-right text-blue-400 font-semibold">{u.event_count}</td>
                    <td className="py-2 text-right text-gray-500">
                      {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {perUser.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-gray-600">No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Live Event Stream" subtitle="Real-time feed of the most recent user interactions — refreshes every 30s">
          <div className="overflow-auto max-h-64 space-y-0.5">
            {stream.map(ev => (
              <div key={ev.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5">
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] shrink-0 font-medium">
                  {EVENT_LABELS[ev.event] || ev.event}
                </span>
                <span className="text-gray-400 truncate">{ev.user_email || 'anon'}</span>
                {ev.page && <span className="text-gray-600 text-[10px] shrink-0">/{ev.page}</span>}
                <span className="text-gray-600 ml-auto shrink-0 tabular-nums">
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {stream.length === 0 && (
              <p className="text-center text-gray-600 py-8 text-xs">No events tracked yet</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
