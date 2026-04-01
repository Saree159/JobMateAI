import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { RefreshCw, MousePointerClick, Users, Activity, Eye } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function jwtHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { Authorization: `Bearer ${token}` };
}

async function fetchSummary(days) {
  const r = await fetch(`${API_BASE}/api/admin/behavior/summary?days=${days}`, { headers: jwtHeaders() });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function fetchStream() {
  const r = await fetch(`${API_BASE}/api/admin/behavior/stream?limit=60`, { headers: jwtHeaders() });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function fetchPerUser() {
  const r = await fetch(`${API_BASE}/api/admin/behavior/per-user?days=30`, { headers: jwtHeaders() });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

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

const COLORS = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
};

function Stat({ label, value, icon: Icon, color = 'blue' }) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      </div>
      <Icon className={`w-6 h-6 ${COLORS[color]}`} />
    </div>
  );
}

export default function Behavior() {
  const [days, setDays] = useState(7);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['admin-behavior', days],
    queryFn: () => fetchSummary(days),
    staleTime: 60_000,
  });
  const { data: stream = [] } = useQuery({
    queryKey: ['admin-stream'],
    queryFn: fetchStream,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const { data: perUser = [] } = useQuery({
    queryKey: ['admin-per-user'],
    queryFn: fetchPerUser,
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">User Behavior</h1>
          <p className="text-gray-400 text-sm">What users actually do in the app</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active Users" value={summary?.active_users} icon={Users} color="blue" />
        <Stat label="Total Events" value={summary?.total_events} icon={Activity} color="purple" />
        <Stat label="Job Clicks" value={summary?.by_event?.job_click ?? 0} icon={MousePointerClick} color="green" />
        <Stat label="Page Views" value={summary?.by_event?.page_view ?? 0} icon={Eye} color="orange" />
      </div>

      {/* Daily trend */}
      <div className="bg-gray-800/60 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-300 mb-4">Events per Day</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={summary?.daily || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Event breakdown + Page breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gray-800/60 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-300 mb-4">Events by Action</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventChart} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-300 mb-4">Traffic by Page</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pageChart} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-user activity + Event stream */}
      <div className="grid lg:grid-cols-2 gap-4">

        <div className="bg-gray-800/60 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-300 mb-3">Most Active Users (30d)</p>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left pb-2">Email</th>
                  <th className="text-right pb-2">Events</th>
                  <th className="text-right pb-2">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {perUser.map(u => (
                  <tr key={u.user_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-1.5 text-gray-200 truncate max-w-[180px]">{u.email || `#${u.user_id}`}</td>
                    <td className="py-1.5 text-right text-blue-400 font-semibold">{u.event_count}</td>
                    <td className="py-1.5 text-right text-gray-500">
                      {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {perUser.length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-gray-600">No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-300 mb-3">Live Event Stream</p>
          <div className="overflow-auto max-h-64 space-y-1">
            {stream.map(ev => (
              <div key={ev.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-700/50">
                <span className="px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 text-[10px] shrink-0">
                  {EVENT_LABELS[ev.event] || ev.event}
                </span>
                <span className="text-gray-400 truncate">{ev.user_email || 'anon'}</span>
                {ev.page && <span className="text-gray-600 text-[10px]">/{ev.page}</span>}
                <span className="text-gray-600 ml-auto shrink-0">
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {stream.length === 0 && (
              <p className="text-center text-gray-600 py-6 text-xs">No events tracked yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
