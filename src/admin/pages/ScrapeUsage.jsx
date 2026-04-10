import React, { useEffect, useState } from 'react';
import { adminApi } from '@/api/admin';
import { RefreshCw, Loader2, Search, Crown, Zap, AlertTriangle } from 'lucide-react';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

function ScraperApiWidget({ loading, account }) {
  if (loading) {
    return (
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }
  if (!account) return null;

  const { request_count, request_limit, concurrent_request_count, concurrent_request_limit } = account;
  const pct = request_limit > 0 ? (request_count / request_limit) * 100 : 0;
  const remaining = request_limit - request_count;
  const isWarning = pct >= 80;
  const isCritical = pct >= 95;

  const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className={`bg-card border rounded-2xl p-5 ${isCritical ? 'border-red-500/30' : isWarning ? 'border-amber-500/30' : 'border-white/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-blue-400'}`} />
          <span className="text-sm font-semibold text-white">ScraperAPI Credits</span>
        </div>
        {isWarning && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
            isCritical
              ? 'bg-red-500/15 text-red-400 border-red-500/30'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            {isCritical ? 'Critical' : 'Warning'}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-white">{request_count.toLocaleString()}</span>
          <span className="text-gray-500 text-sm ml-1">/ {request_limit.toLocaleString()}</span>
          <p className="text-xs text-gray-500 mt-0.5">{remaining.toLocaleString()} credits remaining · {pct.toFixed(1)}% used</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Concurrent</p>
          <p className="text-sm font-semibold text-white">{concurrent_request_count} / {concurrent_request_limit}</p>
        </div>
      </div>
    </div>
  );
}

export default function ScrapeUsagePage() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [account, setAccount]   = useState(null);
  const [acctLoading, setAcctLoading] = useState(true);
  const [search, setSearch]     = useState('');

  const load = () => {
    setLoading(true);
    setAcctLoading(true);
    Promise.all([
      adminApi.getScrapeUsage().catch(() => []),
      adminApi.getScraperApiAccount().catch(() => null),
    ]).then(([usageRows, acct]) => {
      setRows(usageRows);
      setAccount(acct);
    }).finally(() => {
      setLoading(false);
      setAcctLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  // Group by user, summing counts across all dates
  const byUser = {};
  rows.forEach(r => {
    const key = r.user_id;
    if (!byUser[key]) {
      byUser[key] = {
        user_id:   r.user_id,
        email:     r.email,
        full_name: r.full_name,
        tier:      r.tier,
        total:     0,
        days:      [],
      };
    }
    byUser[key].total += r.count;
    byUser[key].days.push({ date: r.date, count: r.count });
  });

  const users = Object.values(byUser)
    .sort((a, b) => b.total - a.total)
    .filter(u =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase())
    );

  const FREE_LIMIT = 2;
  const totalScrapes = rows.reduce((s, r) => s + r.count, 0);
  const uniqueUsers  = Object.keys(byUser).length;
  const limitHit     = users.filter(u => u.days.some(d => d.count >= FREE_LIMIT && u.tier === 'free')).length;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scrape Usage</h1>
          <p className="text-gray-400 text-sm mt-1">Daily job refresh counts per user · last 30 days</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* ScraperAPI credit widget */}
      <ScraperApiWidget loading={acctLoading} account={account} />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total scrapes (window)', value: totalScrapes },
          { label: 'Active users',           value: uniqueUsers  },
          { label: 'Free users at limit',    value: limitHit     },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-white/5 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            {loading
              ? <Skeleton className="h-8 w-16" />
              : <p className="text-3xl font-bold text-white">{value}</p>
            }
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {search ? 'No matching users' : 'No scrape activity in the last 25 hours'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">User</th>
                  <th className="text-center px-4 py-3 font-medium">Plan</th>
                  <th className="text-center px-4 py-3 font-medium">Total scrapes</th>
                  <th className="text-left px-4 py-3 font-medium">Breakdown by date</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const atLimit = u.tier === 'free' && u.days.some(d => d.count >= FREE_LIMIT);
                  return (
                    <tr key={u.user_id} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{u.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 justify-center w-fit mx-auto ${
                          u.tier === 'pro'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {u.tier === 'pro' && <Crown className="w-3 h-3" />}
                          {u.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-lg font-bold ${
                          atLimit ? 'text-amber-400' : 'text-white'
                        }`}>
                          {u.total}
                        </span>
                        {u.tier === 'free' && (
                          <p className="text-[10px] text-gray-600 mt-0.5">/ {FREE_LIMIT} limit</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          {u.days.sort((a, b) => b.date.localeCompare(a.date)).map(d => (
                            <span
                              key={d.date}
                              className={`text-xs px-2 py-0.5 rounded-md border font-mono ${
                                u.tier === 'free' && d.count >= FREE_LIMIT
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-white/5 border-white/10 text-gray-400'
                              }`}
                            >
                              {d.date} · <span className="text-white font-semibold">{d.count}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {atLimit ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            Limit reached
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Data sourced from DB · resets daily at midnight UTC · Pro users have no scrape limit.
      </p>
    </div>
  );
}
