import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin';
import {
  RefreshCw, Play, PlayCircle, Clock, CheckCircle2,
  XCircle, Zap, AlertTriangle, Settings,
} from 'lucide-react';

const SOURCE_META = {
  linkedin: {
    label: 'LinkedIn',
    color: 'bg-sky-500/20 border-sky-500/30 text-sky-300',
    dot: 'bg-sky-400',
    desc: 'Guest API — scrapes LinkedIn job listings by role + location. Main production source.',
  },
  drushim: {
    label: 'Drushim',
    color: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
    dot: 'bg-orange-400',
    desc: 'Israeli job board — fetches via RSS feed, categorised by role. No auth required.',
  },
  techmap: {
    label: 'TechMap',
    color: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    dot: 'bg-purple-400',
    desc: 'GitHub CSV export of Israeli tech jobs (mluggy/techmap). Updated daily by the community.',
  },
};

function ago(dt) {
  if (!dt) return 'Never';
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
        checked ? 'bg-emerald-500' : 'bg-white/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SourceCard({ source, onUpdate }) {
  const meta = SOURCE_META[source.source] || {
    label: source.source,
    color: 'bg-white/10 border-white/20 text-gray-300',
    dot: 'bg-gray-400',
    desc: '',
  };

  const [toggling, setToggling] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [editSchedule, setEditSchedule] = useState(false);
  const [hour, setHour] = useState(source.schedule_hour);
  const [minute, setMinute] = useState(source.schedule_minute);
  const [savingSchedule, setSavingSchedule] = useState(false);

  async function toggle(val) {
    setToggling(true);
    try {
      const updated = await adminApi.updateSource(source.source, { enabled: val });
      onUpdate(updated);
    } finally {
      setToggling(false);
    }
  }

  async function trigger() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const r = await adminApi.triggerSource(source.source);
      setTriggerResult({ ok: true, cleared: r.cache_entries_cleared });
    } catch {
      setTriggerResult({ ok: false });
    } finally {
      setTriggering(false);
    }
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    try {
      const updated = await adminApi.updateSource(source.source, {
        schedule_hour: Number(hour),
        schedule_minute: Number(minute),
      });
      onUpdate(updated);
      setEditSchedule(false);
    } finally {
      setSavingSchedule(false);
    }
  }

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${meta.color} bg-opacity-10`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${source.enabled ? meta.dot : 'bg-gray-600'}`} />
          <div>
            <p className="text-sm font-semibold text-white">{meta.label}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{meta.desc}</p>
          </div>
        </div>
        <Toggle checked={source.enabled} onChange={toggle} disabled={toggling} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-500 mb-1">Status</p>
          <p className={`font-semibold ${source.enabled ? 'text-emerald-400' : 'text-gray-500'}`}>
            {source.enabled ? 'Active' : 'Disabled'}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-500 mb-1">Last run</p>
          <p className="text-white font-medium">{ago(source.last_run_at)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-500 mb-1">Last count</p>
          <p className="text-white font-medium">
            {source.last_job_count > 0 ? `${source.last_job_count} jobs` : '—'}
          </p>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white/5 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Daily schedule (Israel time)
          </p>
          {!editSchedule && (
            <button
              onClick={() => setEditSchedule(true)}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {editSchedule ? (
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={23} value={hour}
              onChange={e => setHour(e.target.value)}
              className="w-14 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500/50"
            />
            <span className="text-gray-400">:</span>
            <input
              type="number" min={0} max={59} value={minute}
              onChange={e => setMinute(e.target.value)}
              className="w-14 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setEditSchedule(false); setHour(source.schedule_hour); setMinute(source.schedule_minute); }}
              className="px-2 py-1 text-gray-500 text-xs hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-white">
            {pad(source.schedule_hour)}:{pad(source.schedule_minute)}
          </p>
        )}
      </div>

      {/* Notes */}
      {source.notes && (
        <p className="text-[11px] text-gray-600 italic">{source.notes}</p>
      )}

      {/* Trigger button */}
      <div className="flex items-center gap-3">
        <button
          onClick={trigger}
          disabled={triggering}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50"
        >
          <Play className={`w-3 h-3 ${triggering ? 'animate-spin' : ''}`} />
          {triggering ? 'Clearing cache…' : 'Force refresh'}
        </button>
        {triggerResult?.ok && (
          <span className="text-xs text-emerald-400">
            ✓ Cleared {triggerResult.cleared} cache entries
          </span>
        )}
        {triggerResult?.ok === false && (
          <span className="text-xs text-red-400">Failed</span>
        )}
      </div>
    </div>
  );
}

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [triggerAllResult, setTriggerAllResult] = useState(null);

  useEffect(() => {
    adminApi.getSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(updated) {
    setSources(prev => prev.map(s => s.source === updated.source ? updated : s));
  }

  async function triggerAll() {
    setTriggeringAll(true);
    setTriggerAllResult(null);
    try {
      const r = await adminApi.triggerAllSources();
      setTriggerAllResult({ ok: true, users: r.user_caches_cleared });
    } catch {
      setTriggerAllResult({ ok: false });
    } finally {
      setTriggeringAll(false);
    }
  }

  const enabledCount = sources.filter(s => s.enabled).length;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Job Source Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control which job boards are active, their daily refresh schedule, and trigger manual cache clears
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {enabledCount} of {sources.length} sources active · Schedule runs in Israel time (Asia/Jerusalem)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {triggerAllResult?.ok && (
            <span className="text-xs text-emerald-400">✓ All caches cleared · {triggerAllResult.users} users reset</span>
          )}
          {triggerAllResult?.ok === false && (
            <span className="text-xs text-red-400">Failed</span>
          )}
          <button
            onClick={triggerAll}
            disabled={triggeringAll}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${triggeringAll ? 'animate-spin' : ''}`} />
            {triggeringAll ? 'Clearing…' : 'Clear all caches'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
        <p className="text-gray-400 font-medium mb-2 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> How it works</p>
        <p>• Each source runs once daily at its scheduled time (Israel timezone). Shared role-level caches mean one scrape covers all users with the same target role.</p>
        <p>• <span className="text-gray-400">Force refresh</span> clears that source's role-level cache — the next user who requests jobs will trigger a fresh scrape.</p>
        <p>• <span className="text-gray-400">Clear all caches</span> also resets per-user caches, forcing everyone's dashboard to re-fetch on next load.</p>
        <p>• Disabled sources are completely skipped — their cache is not cleared and not re-scraped during the daily cycle.</p>
      </div>

      {/* Source cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No source configs found. They are seeded automatically on first backend startup.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {sources.map(src => (
            <SourceCard key={src.source} source={src} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
