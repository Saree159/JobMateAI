import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '@/api/admin';
import {
  Search, ChevronDown, ChevronRight, RefreshCw,
  User, Briefcase, MapPin, Zap, DollarSign,
  CheckCircle2, XCircle, Clock, Linkedin, FileText,
  Mail, Calendar, Shield, TrendingUp, Activity, MousePointerClick,
} from 'lucide-react';

const EVENT_LABELS = {
  page_view:       'Page View',
  job_click:       'Job Click',
  job_save:        'Job Save',
  job_apply:       'Job Apply',
  refresh_matches: 'Refresh',
  load_more:       'Load More',
  filter_change:   'Filter',
  profile_update:  'Profile Update',
  resume_upload:   'Resume Upload',
  search:          'Search',
  page_time:       'Time on Page',
  registration_start:          'Reg Start',
  registration_field_email:    'Reg Email',
  registration_field_password: 'Reg Password',
  registration_submit_attempt: 'Reg Submit',
  registration_complete:       'Reg Complete',
};

const EVENT_COLOR = {
  page_view:      'bg-blue-500/20 text-blue-300',
  job_click:      'bg-emerald-500/20 text-emerald-300',
  job_save:       'bg-teal-500/20 text-teal-300',
  job_apply:      'bg-green-500/20 text-green-300',
  profile_update: 'bg-purple-500/20 text-purple-300',
  resume_upload:  'bg-purple-500/20 text-purple-300',
  search:         'bg-amber-500/20 text-amber-300',
  filter_change:  'bg-amber-500/20 text-amber-300',
  page_time:      'bg-gray-500/20 text-gray-400',
};

function fmtTime2(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ActivityTab({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUserActivity(userId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!data || data.total_events === 0) {
    return <p className="text-xs text-gray-600 italic py-6 text-center">No events tracked for this user yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-4 pb-3 border-b border-white/5 text-xs">
        <div><span className="text-gray-500">Total events</span> <span className="text-white font-semibold ml-1">{data.total_events}</span></div>
        <div><span className="text-gray-500">First seen</span> <span className="text-gray-300 ml-1">{fmtTime2(data.first_seen)}</span></div>
        <div><span className="text-gray-500">Last seen</span> <span className="text-gray-300 ml-1">{fmtTime2(data.last_seen)}</span></div>
      </div>

      {/* Pages + Actions breakdown */}
      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">Pages visited</p>
          <p className="text-[10px] text-gray-600 mb-2">Sections this user has navigated to</p>
          <div className="space-y-1">
            {data.pages.slice(0, 6).map(({ page, count }) => (
              <div key={page} className="flex justify-between text-xs">
                <span className="text-gray-400 capitalize">{page}</span>
                <span className="text-white font-medium">{count}×</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">Actions</p>
          <p className="text-[10px] text-gray-600 mb-2">Non-navigation interactions (clicks, saves, searches)</p>
          <div className="space-y-1">
            {data.actions.filter(a => a.event !== 'page_view' && a.event !== 'page_time').slice(0, 6).map(({ event, count }) => (
              <div key={event} className="flex justify-between text-xs">
                <span className="text-gray-400">{EVENT_LABELS[event] || event}</span>
                <span className="text-white font-medium">{count}×</span>
              </div>
            ))}
            {data.actions.filter(a => a.event !== 'page_view' && a.event !== 'page_time').length === 0 && (
              <span className="text-xs text-gray-600 italic">Only page views so far</span>
            )}
          </div>
        </div>
      </div>

      {/* Event timeline */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">Recent timeline</p>
        <p className="text-[10px] text-gray-600 mb-2">Chronological feed of this user's last 150 tracked events (page_time events hidden for clarity)</p>
        <div className="space-y-0.5 max-h-48 overflow-auto">
          {data.events.filter(ev => ev.event !== 'page_time').map(ev => (
            <div key={ev.id} className="flex items-center gap-2 py-1 text-xs border-b border-white/5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${EVENT_COLOR[ev.event] || 'bg-indigo-500/20 text-indigo-300'}`}>
                {EVENT_LABELS[ev.event] || ev.event}
              </span>
              {ev.page && <span className="text-gray-500 shrink-0">/{ev.page}</span>}
              {ev.properties?.job_title && <span className="text-gray-400 truncate">{ev.properties.job_title}</span>}
              {ev.properties?.query && <span className="text-gray-400 truncate">"{ev.properties.query}"</span>}
              <span className="text-gray-600 ml-auto shrink-0 tabular-nums">{fmtTime2(ev.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FEATURE_LABEL = {
  cover_letter: 'Cover Letter',
  interview_questions: 'Interview Q',
  salary_estimate: 'Salary Est.',
  resume_rewrite: 'Resume Rewrite',
  resume_evaluation: 'Resume Eval',
  gap_analysis: 'Gap Analysis',
  opening_sentence: 'Opening',
  match_score: 'Match Score',
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function ago(dt) {
  if (!dt) return '—';
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Pill({ children, color = 'gray' }) {
  const styles = {
    green:  'bg-green-600  text-white border-green-700',
    blue:   'bg-blue-600   text-white border-blue-700',
    purple: 'bg-purple-600 text-white border-purple-700',
    amber:  'bg-amber-500  text-white border-amber-600',
    gray:   'bg-white/15   text-gray-300 border-white/10',
    red:    'bg-red-600    text-white border-red-700',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[color]}`}>
      {children}
    </span>
  );
}

const ALL_STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];
const STATUS_META = {
  saved:     { color: 'gray',   label: 'Saved'     },
  applied:   { color: 'blue',   label: 'Applied'   },
  interview: { color: 'purple', label: 'Interview' },
  offer:     { color: 'green',  label: 'Offer'     },
  rejected:  { color: 'red',    label: 'Rejected'  },
};

function DetailPanel({ user }) {
  const [tab, setTab] = useState('details');
  const TABS = [
    { id: 'details',  label: 'Details' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="bg-[#0b1120] border-t border-white/5">
      {/* Tab bar */}
      <div className="flex gap-1 px-5 pt-3 border-b border-white/5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              tab === t.id ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-5 pt-4">
        {tab === 'activity' ? (
          <ActivityTab userId={user.id} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


      {/* Profile */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Profile</p>
        <p className="text-[10px] text-gray-600 -mt-1">Job preferences and skills set by the user in their profile settings</p>
        <div className="space-y-2 text-sm">
          {[
            ['Role', user.target_role],
            ['Experience', user.years_of_experience != null ? `${user.years_of_experience} yrs` : null],
            ['Location', user.location_preference],
            ['Work Mode', user.work_mode_preference],
            ['Industry', user.industry_preference],
            ['Job Type', user.job_type_preference],
            ['Availability', user.availability],
            ['Min Salary', user.min_salary_preference ? `₪${user.min_salary_preference.toLocaleString()}` : null],
          ].map(([label, val]) => val ? (
            <div key={label} className="flex justify-between gap-2">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-200 font-medium text-right">{val}</span>
            </div>
          ) : null)}
          <div className="flex flex-wrap gap-1 pt-1">
            {user.has_resume && <Pill color="blue">📄 Resume</Pill>}
            {user.linkedin_connected && <Pill color="blue">in LinkedIn</Pill>}
            {user.is_verified ? <Pill color="green">✓ Verified</Pill> : <Pill color="red">✗ Unverified</Pill>}
          </div>
          {user.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {user.skills.map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-white/8 border border-white/10 rounded text-[10px] text-gray-300">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Jobs */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Applications</p>
        <p className="text-[10px] text-gray-600 -mt-1">Job applications saved or tracked by the user in their personal pipeline</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Total tracked</span>
            <span className={`font-semibold ${user.jobs_total > 0 ? 'text-white' : 'text-gray-600'}`}>{user.jobs_total}</span>
          </div>
          {ALL_STATUSES.map(status => {
            const count = user.jobs_by_status?.[status] ?? 0;
            const { color, label } = STATUS_META[status];
            return (
              <div key={status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {/* checkbox-style applied indicator */}
                  <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                    count > 0
                      ? color === 'blue'   ? 'bg-blue-600 border-blue-700'
                      : color === 'green'  ? 'bg-green-600 border-green-700'
                      : color === 'purple' ? 'bg-purple-600 border-purple-700'
                      : color === 'red'    ? 'bg-red-600 border-red-700'
                      :                     'bg-white/20 border-white/20'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    {count > 0 && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                  </span>
                  <span className={count > 0 ? 'text-gray-300' : 'text-gray-600'}>{label}</span>
                </div>
                <Pill color={count > 0 ? color : 'gray'}>{count}</Pill>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Usage */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">AI Usage</p>
        <p className="text-[10px] text-gray-600 -mt-1">OpenAI tokens consumed by this user — cover letters, match scores, gap analysis, etc.</p>
        {user.ai.total_calls === 0 ? (
          <p className="text-sm text-gray-600">No AI calls yet</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total tokens</span>
              <span className="text-white font-semibold">{user.ai.total_tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Est. cost</span>
              <span className="text-amber-400 font-semibold">${user.ai.total_cost_usd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Calls</span>
              <span className="text-white font-semibold">{user.ai.total_calls}</span>
            </div>
            <div className="border-t border-white/5 pt-2 space-y-1">
              {user.ai.by_feature.sort((a, b) => b.tokens - a.tokens).map(f => (
                <div key={f.feature} className="flex justify-between text-xs">
                  <span className="text-gray-500">{FEATURE_LABEL[f.feature] || f.feature}</span>
                  <span className="text-gray-300">{f.tokens.toLocaleString()} tk · {f.calls}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default function UserLogs() {
  const [data, setData] = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortBy, setSortBy] = useState('joined');
  const [sortDir, setSortDir] = useState('desc');

  const PER_PAGE = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    adminApi.getUsersDetail(PER_PAGE, page * PER_PAGE, debouncedSearch)
      .then(setData)
      .catch(() => setData({ users: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, refreshKey]);

  const sorted = useMemo(() => {
    const arr = [...data.users];
    arr.sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'joined':    va = a.joined_at || '';     vb = b.joined_at || '';     break;
        case 'tokens':    va = a.ai.total_tokens;      vb = b.ai.total_tokens;     break;
        case 'cost':      va = a.ai.total_cost_usd;    vb = b.ai.total_cost_usd;   break;
        case 'jobs':      va = a.jobs_total;            vb = b.jobs_total;          break;
        case 'lastlogin': va = a.last_login_at || '';  vb = b.last_login_at || ''; break;
        default:          va = a.email;                vb = b.email;
      }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return arr;
  }, [data.users, sortBy, sortDir]);

  const totalTokens = data.users.reduce((s, u) => s + u.ai.total_tokens, 0);
  const totalCost = data.users.reduce((s, u) => s + u.ai.total_cost_usd, 0);
  const verified = data.users.filter(u => u.is_verified).length;

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  function SortHeader({ col, children }) {
    const active = sortBy === col;
    return (
      <th
        className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-white transition-colors"
        onClick={() => toggleSort(col)}
      >
        <span className={`flex items-center gap-1 ${active ? 'text-blue-400' : ''}`}>
          {children}
          {active && <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
        </span>
      </th>
    );
  }

  const totalPages = Math.ceil(data.total / PER_PAGE);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Logs</h1>
          <p className="text-gray-400 text-sm mt-1">
            {data.total} users · {totalTokens.toLocaleString()} tokens · ${totalCost.toFixed(4)} spent
          </p>
          <p className="text-xs text-gray-600 mt-1">Full roster of registered users. Click any row to see profile details, application pipeline, AI usage, and behavioral activity.</p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary pills */}
      <p className="text-xs text-gray-600 -mb-1">Counts reflect the current page of results (up to {data.users.length} users shown)</p>
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total',       value: data.total,                                              color: 'bg-blue-600   border-blue-700'   },
          { label: 'Verified',    value: verified,                                                color: 'bg-green-600  border-green-700'  },
          { label: 'Unverified',  value: data.total - verified,                                   color: 'bg-red-600    border-red-700'    },
          { label: 'With Resume', value: data.users.filter(u => u.has_resume).length,             color: 'bg-purple-600 border-purple-700' },
          { label: 'LinkedIn',    value: data.users.filter(u => u.linkedin_connected).length,     color: 'bg-sky-600    border-sky-700'    },
          { label: 'Pro',         value: data.users.filter(u => u.subscription_tier === 'pro').length, color: 'bg-amber-500  border-amber-600'  },
        ].map(({ label, value, color }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-white text-sm font-medium ${color}`}>
            <span className="text-xs text-white/70">{label}</span>
            <span className="font-bold">{value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search email, name, role…"
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d1829] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5">
                <th className="w-8" />
                <SortHeader col="email" title="Name and email address">User</SortHeader>
                <th className="text-left px-4 py-3 font-medium" title="Target job role, preferred location, work mode, and skill count">Role / Looking For</th>
                <th className="text-left px-4 py-3 font-medium" title="Subscription tier — free or pro">Plan</th>
                <SortHeader col="jobs" title="Total job applications tracked in their pipeline">Jobs</SortHeader>
                <SortHeader col="tokens" title="Total OpenAI tokens consumed by this user across all AI features">Tokens</SortHeader>
                <SortHeader col="cost" title="Estimated USD cost of AI calls made by this user">Cost</SortHeader>
                <SortHeader col="lastlogin" title="Most recent login event recorded">Last Login</SortHeader>
                <SortHeader col="joined" title="Account creation date">Joined</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && sorted.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-600">No users found</td>
                </tr>
              ) : sorted.map(user => (
                <React.Fragment key={user.id}>
                  <tr
                    className="hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  >
                    {/* Expand toggle */}
                    <td className="pl-4 py-3.5 text-gray-600">
                      {expandedId === user.id
                        ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                        : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-white leading-snug">{user.full_name || <span className="text-gray-600 italic">No name</span>}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {user.is_verified
                          ? <Pill color="green">✓ verified</Pill>
                          : <Pill color="red">✗ unverified</Pill>}
                        {user.linkedin_connected && <Pill color="blue">in</Pill>}
                        {user.has_resume && <Pill color="purple">📄</Pill>}
                      </div>
                    </td>

                    {/* Role / Looking For */}
                    <td className="px-4 py-3.5">
                      <p className="text-gray-200 text-xs font-medium">{user.target_role || <span className="text-gray-600">—</span>}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.location_preference && <span className="text-[10px] text-gray-500">{user.location_preference}</span>}
                        {user.work_mode_preference && <span className="text-[10px] text-gray-600">· {user.work_mode_preference}</span>}
                        {user.min_salary_preference && <span className="text-[10px] text-gray-600">· ₪{user.min_salary_preference.toLocaleString()}+</span>}
                      </div>
                      {user.skills_count > 0 && (
                        <p className="text-[10px] text-gray-600 mt-0.5">{user.skills_count} skills</p>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3.5">
                      <Pill color={user.subscription_tier === 'pro' ? 'green' : 'gray'}>
                        {user.subscription_tier}
                      </Pill>
                    </td>

                    {/* Jobs */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-semibold ${user.jobs_total > 0 ? 'text-white' : 'text-gray-600'}`}>
                        {user.jobs_total}
                      </span>
                    </td>

                    {/* Tokens */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono text-xs ${user.ai.total_tokens > 0 ? 'text-blue-300' : 'text-gray-700'}`}>
                        {user.ai.total_tokens > 0 ? user.ai.total_tokens.toLocaleString() : '—'}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono text-xs ${user.ai.total_cost_usd > 0 ? 'text-amber-400' : 'text-gray-700'}`}>
                        {user.ai.total_cost_usd > 0 ? `$${user.ai.total_cost_usd.toFixed(4)}` : '—'}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs text-gray-400">{ago(user.last_login_at)}</span>
                      {user.last_login_at && (
                        <p className="text-[10px] text-gray-600">{fmt(user.last_login_at)}</p>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs text-gray-500">{fmt(user.joined_at)}</span>
                    </td>
                  </tr>

                  {expandedId === user.id && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <DetailPanel user={user} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">
              {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
