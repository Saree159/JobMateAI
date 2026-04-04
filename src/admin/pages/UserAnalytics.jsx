import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, TrendingDown, ArrowRight, BarChart2, Navigation, CheckCircle2, TrendingUp } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

async function fetchUserAnalytics() {
  const res = await fetch(`${API_BASE}/api/admin/user-analytics`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user analytics');
  return res.json();
}

function fmtTime(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function pct(num, denom) {
  if (!denom) return '—';
  return `${Math.round((num / denom) * 100)}%`;
}

// Simple horizontal bar
function Bar({ value, max, color = 'bg-blue-500' }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${width}%` }} />
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, color = 'text-blue-400' }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function UserAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-analytics'],
    queryFn: fetchUserAnalytics,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        Failed to load analytics. Make sure you're logged in as admin.
      </div>
    );
  }

  const funnel = data?.funnel || [];
  const maxFunnelCount = Math.max(...funnel.map(f => f.count), 1);
  const startCount = funnel[0]?.count || 0;
  const completeCount = funnel[funnel.length - 1]?.count || 0;
  const conversionPct = startCount > 0 ? Math.round((completeCount / startCount) * 100) : null;

  const firstPages = Object.entries(data?.first_page_after_registration || {});
  const maxFirstPage = Math.max(...firstPages.map(([, v]) => v), 1);

  const pageTimes = Object.entries(data?.avg_time_per_page_seconds || {}).sort((a, b) => b[1] - a[1]);
  const maxPageTime = Math.max(...pageTimes.map(([, v]) => v), 1);

  const flows = data?.top_flows || [];

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-white">User Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Registration funnel, behavior, and navigation patterns</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Registered Users"
          value={data?.total_users?.toLocaleString()}
          icon={Users}
          color="text-blue-400"
        />
        <KPI
          label="Funnel Starts"
          value={startCount > 0 ? startCount.toLocaleString() : '—'}
          sub="visited /register"
          icon={TrendingDown}
          color="text-emerald-400"
        />
        <KPI
          label="Conversion"
          value={conversionPct !== null ? `${conversionPct}%` : '—'}
          sub="start → complete"
          icon={BarChart2}
          color="text-purple-400"
        />
        <KPI
          label="Avg. Signup Time"
          value={fmtTime(data?.avg_registration_seconds)}
          sub="start to complete"
          icon={Clock}
          color="text-amber-400"
        />
      </div>

      {/* ── Registration Funnel ── */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-400" />
          Registration Funnel — Drop-off by Step
        </h3>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const dropPct = i > 0 && funnel[i - 1].count > 0
              ? Math.round(((funnel[i - 1].count - step.count) / funnel[i - 1].count) * 100)
              : null;
            return (
              <div key={step.event} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-medium">{step.label}</span>
                  <div className="flex items-center gap-3">
                    {dropPct !== null && dropPct > 0 && (
                      <span className="text-red-400 text-[11px]">↓ {dropPct}% drop</span>
                    )}
                    <span className="text-white font-semibold w-10 text-right">
                      {step.count > 0 ? step.count.toLocaleString() : '—'}
                    </span>
                    <span className="text-gray-600 w-8 text-right">
                      {pct(step.count, startCount || completeCount)}
                    </span>
                  </div>
                </div>
                <Bar
                  value={step.count}
                  max={maxFunnelCount}
                  color={i === funnel.length - 1 ? 'bg-emerald-500' : 'bg-blue-500'}
                />
              </div>
            );
          })}
        </div>
        {startCount === 0 && (
          <p className="text-xs text-gray-600 mt-4 italic">
            Funnel tracking not yet active — starts firing after first registration visit.
          </p>
        )}
      </section>

      {/* ── First page after registration ── */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-400" />
          First Page After Registration
        </h3>
        {firstPages.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {firstPages.map(([page, count]) => (
              <div key={page} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-28 capitalize shrink-0">{page}</span>
                <Bar value={count} max={maxFirstPage} color="bg-emerald-500" />
                <span className="text-sm text-white font-medium w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Time per section ── */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Avg. Time Spent per Section
        </h3>
        {pageTimes.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No data yet — collects after users navigate between pages.</p>
        ) : (
          <div className="space-y-2.5">
            {pageTimes.map(([page, seconds]) => (
              <div key={page} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-28 capitalize shrink-0">{page}</span>
                <Bar value={seconds} max={maxPageTime} color="bg-amber-500" />
                <span className="text-sm text-white font-medium w-14 text-right">{fmtTime(seconds)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Signup Trend ── */}
      {data?.signups_by_day?.length > 0 && (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Daily Signups — Last 30 Days
          </h3>
          <div className="flex items-end gap-1 h-20">
            {(() => {
              const days = data.signups_by_day;
              const max = Math.max(...days.map(d => d.count), 1);
              return days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-blue-500/70 hover:bg-blue-400 rounded-sm transition-all cursor-default"
                    style={{ height: `${Math.max(4, Math.round((d.count / max) * 72))}px` }}
                  />
                  {d.count > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white bg-gray-800 px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                      {d.date.slice(5)}: {d.count}
                    </span>
                  )}
                </div>
              ));
            })()}
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>{data.signups_by_day[0]?.date?.slice(5)}</span>
            <span>{data.signups_by_day[data.signups_by_day.length - 1]?.date?.slice(5)}</span>
          </div>
        </section>
      )}

      {/* ── Profile Completion ── */}
      {data?.profile_completion && (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Post-Registration Profile Completion
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Set target role', value: data.profile_completion.with_role },
              { label: 'Added skills', value: data.profile_completion.with_skills },
              { label: 'Uploaded resume', value: data.profile_completion.with_resume },
            ].map(({ label, value }) => {
              const total = data.profile_completion.total_users;
              const p = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-36 shrink-0">{label}</span>
                  <Bar value={value} max={total} color="bg-emerald-500" />
                  <span className="text-sm text-white font-medium w-10 text-right">{p}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Navigation Flows ── */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-purple-400" />
          Top Navigation Flows (last 30 days)
        </h3>
        {flows.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No flow data yet.</p>
        ) : (
          <div className="space-y-1.5">
            {flows.map((flow, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-300 font-mono">{flow.path}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.round((flow.count / flows[0].count) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">{flow.count}×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
