import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Clock, Tag } from 'lucide-react';
import { useAdminStats } from '../useAdminStats';

function buildAlerts(stats) {
  if (!stats) return [];
  const { users, jobs, ingest, applications } = stats;
  const alerts = [];
  let id = 1;

  // Ingest failures
  if (ingest.failed_events > 0) {
    alerts.push({ id: id++, severity: 'critical', title: 'Ingest pipeline errors detected', detail: `${ingest.failed_events} ingestion event(s) failed. Check the ingest_events table for details.`, feature: 'Ingestion', status: 'open' });
  }

  // No pro users at all
  if (users.total > 0 && users.pro === 0) {
    alerts.push({ id: id++, severity: 'warning', title: 'No paid subscribers yet', detail: `You have ${users.total.toLocaleString()} registered users but 0 Pro subscribers. Review your pricing page and PayPal integration.`, feature: 'Revenue', status: 'open' });
  }

  // Low profile completion
  const profileRate = users.total > 0 ? (users.with_skills / users.total) * 100 : 0;
  if (users.total > 5 && profileRate < 30) {
    alerts.push({ id: id++, severity: 'warning', title: 'Low profile completion rate', detail: `Only ${profileRate.toFixed(0)}% of users have added skills to their profile. This reduces job match quality and activation.`, feature: 'Onboarding', status: 'open' });
  }

  // No jobs tracked
  if (users.total > 10 && jobs.total === 0) {
    alerts.push({ id: id++, severity: 'warning', title: 'Users not tracking jobs', detail: `${users.total.toLocaleString()} users registered but 0 jobs are being tracked. Check if the jobs API is working.`, feature: 'Product', status: 'open' });
  }

  // Low AI usage
  if (jobs.total > 0 && jobs.with_match_score === 0) {
    alerts.push({ id: id++, severity: 'info', title: 'AI match scoring not used yet', detail: 'No jobs have been scored by the AI engine. Users may not be triggering match score calculations.', feature: 'AI', status: 'open' });
  }

  // Ingest jobs available
  if (ingest.total_jobs > 0) {
    alerts.push({ id: id++, severity: 'info', title: 'Job feed populated', detail: `${ingest.total_jobs.toLocaleString()} external jobs in the feed (${ingest.new_today} added today). Scrapers are running.`, feature: 'Scraping', status: 'resolved' });
  }

  // New signups
  if (users.new_today > 0) {
    alerts.push({ id: id++, severity: 'info', title: `${users.new_today} new signup${users.new_today > 1 ? 's' : ''} today`, detail: `${users.new_week} total signups this week. ${users.new_month} this month.`, feature: 'Growth', status: 'info' });
  }

  // Fallback if all is well
  if (alerts.length === 0) {
    alerts.push({ id: id++, severity: 'info', title: 'All systems healthy', detail: 'No issues detected based on current database state.', feature: 'System', status: 'resolved' });
  }

  return alerts;
}

const TABS = ['All', 'Critical', 'Warning', 'Info', 'Resolved'];

const severityConfig = {
  critical: {
    border: '#ef4444',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    icon: AlertCircle,
    iconColor: 'text-red-400',
  },
  warning: {
    border: '#f59e0b',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
  },
  info: {
    border: '#3b82f6',
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    icon: Info,
    iconColor: 'text-blue-400',
  },
};

const statusConfig = {
  open: 'border border-red-500/40 text-red-400 bg-transparent',
  investigating: 'border border-amber-500/40 text-amber-400 bg-transparent',
  resolved: 'border border-green-500/40 text-green-400 bg-transparent',
  info: 'border border-blue-500/40 text-blue-400 bg-transparent',
};

export default function AlertsPage() {
  const { stats, loading } = useAdminStats();
  const [activeTab, setActiveTab] = useState('All');
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const alerts = useMemo(() => buildAlerts(stats), [stats]);

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const warnings = alerts.filter((a) => a.severity === 'warning').length;
  const info = alerts.filter((a) => a.severity === 'info').length;

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Resolved') return a.status === 'resolved' || resolvedIds.has(a.id);
    if (activeTab === 'Critical') return a.severity === 'critical';
    if (activeTab === 'Warning') return a.severity === 'warning';
    if (activeTab === 'Info') return a.severity === 'info';
    return true;
  });

  function handleMarkResolved(id) {
    setResolvedIds((prev) => new Set([...prev, id]));
  }

  function getEffectiveStatus(alert) {
    return resolvedIds.has(alert.id) ? 'resolved' : alert.status;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Alerts</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real-time alerts across all platform systems — Mar 2026
        </p>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-red-400">{critical} Critical</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">{warnings} Warnings</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-blue-400">{info} Info</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white/10 text-white shadow'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const IconComponent = config.icon;
          const effectiveStatus = getEffectiveStatus(alert);
          const isActionable =
            effectiveStatus === 'open' || effectiveStatus === 'investigating';

          return (
            <div
              key={alert.id}
              className="bg-card border border-white/5 rounded-2xl p-5 flex gap-4 hover:border-white/10 transition-colors"
              style={{ borderLeft: `3px solid ${config.border}` }}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
                <IconComponent className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide ${config.badge}`}
                  >
                    {alert.severity}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                      statusConfig[effectiveStatus] || statusConfig.info
                    }`}
                  >
                    {effectiveStatus}
                  </span>
                  {effectiveStatus === 'resolved' && resolvedIds.has(alert.id) && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Just resolved
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-white leading-snug">{alert.title}</p>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">{alert.detail}</p>

                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Tag className="w-3 h-3" />
                    <span>{alert.feature}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{alert.time}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              {isActionable && (
                <div className="flex-shrink-0 flex items-start">
                  <button
                    onClick={() => handleMarkResolved(alert.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-400 border border-white/10 hover:border-green-500/30 transition-all"
                  >
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            <p className="text-sm">No alerts in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
