import React from 'react';
import KPICard from '../components/KPICard';
import { Server, Database, Globe, Activity } from 'lucide-react';
import { useAdminStats } from '../useAdminStats';
import { spark7 } from '../mockData';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

export default function InfrastructurePage() {
  const { stats, loading, error } = useAdminStats();
  const ingest = stats?.ingest ?? {};
  const users = stats?.users ?? {};

  const sourceRows = Object.entries(ingest.by_source ?? {}).map(([source, count]) => ({ source, count }));
  const statusRows = Object.entries(ingest.by_status ?? {}).map(([status, count]) => ({ status, count }));

  if (error) return <div className="p-8 text-center text-red-400">Failed to load data: {error}</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Infrastructure</h1>
        <p className="text-gray-400 text-sm mt-1">Job pipeline health and ingest statistics from live database</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="Total Ingest Jobs" value={ingest.total_jobs ?? 0} icon={Database} accent="#3b82f6" sparkData={spark7(ingest.total_jobs ?? 0, 50)} />
            <KPICard title="New Today" value={ingest.new_today ?? 0} icon={Globe} accent="#22c55e" sparkData={spark7(ingest.new_today ?? 0, 10)} />
            <KPICard title="Ingest Events" value={ingest.total_events ?? 0} icon={Activity} accent="#a855f7" sparkData={spark7(ingest.total_events ?? 0, 5)} />
            <KPICard title="Failed Events" value={ingest.failed_events ?? 0} icon={Server} accent={ingest.failed_events > 0 ? "#ef4444" : "#22c55e"} sparkData={spark7(ingest.failed_events ?? 0, 2)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Source */}
        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-sm font-semibold text-white">Jobs by Source</p>
          </div>
          {loading ? <div className="p-6"><Skeleton className="h-40" /></div> : sourceRows.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">No ingest jobs yet</div>
          ) : (
            <div className="p-5 space-y-3">
              {sourceRows.map(row => {
                const pct = ingest.total_jobs > 0 ? ((row.count / ingest.total_jobs) * 100).toFixed(0) : 0;
                return (
                  <div key={row.source} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium">{row.source || 'Unknown'}</span>
                      <span className="text-white font-semibold">{row.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Status */}
        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-sm font-semibold text-white">Ingest Jobs by Status</p>
          </div>
          {loading ? <div className="p-6"><Skeleton className="h-40" /></div> : statusRows.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">No ingest jobs yet</div>
          ) : (
            <div className="p-5 space-y-3">
              {statusRows.map(row => {
                const colors = { new: '#3b82f6', saved: '#22c55e', applied: '#a855f7', ignored: '#64748b' };
                const pct = ingest.total_jobs > 0 ? ((row.count / ingest.total_jobs) * 100).toFixed(0) : 0;
                return (
                  <div key={row.status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium capitalize">{row.status}</span>
                      <span className="text-white font-semibold">{row.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[row.status] || '#64748b' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ingest Events Summary */}
      <div className="bg-card border border-white/5 rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-4">Ingest Events Summary</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Events', value: ingest.total_events ?? 0, color: 'text-white' },
            { label: 'Processed', value: ingest.processed_events ?? 0, color: 'text-green-400' },
            { label: 'Failed', value: ingest.failed_events ?? 0, color: ingest.failed_events > 0 ? 'text-red-400' : 'text-gray-500' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{loading ? '...' : item.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
        <strong>Note:</strong> Cloud hosting, AI API, and email billing data require integration with your cloud provider (AWS/GCP/DigitalOcean) billing APIs. Add a cost tracking table or connect a billing API to see real cost breakdowns.
      </div>
    </div>
  );
}
