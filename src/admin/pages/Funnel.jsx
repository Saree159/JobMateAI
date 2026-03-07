import React from 'react';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import { useAdminStats } from '../useAdminStats';
import { spark7 } from '../mockData';
import { UserCheck, CreditCard, Star, RefreshCw } from 'lucide-react';

const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  amber: '#f59e0b',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

export default function FunnelPage() {
  const { stats, loading, error } = useAdminStats();
  const f = stats?.funnel ?? {};

  const funnelStages = [
    { stage: 'Registered Users', count: f.total_users ?? 0, color: '#334155' },
    { stage: 'Profile with Skills', count: f.users_with_profile ?? 0, color: '#3b82f6' },
    { stage: 'Tracking Jobs', count: f.users_tracking_jobs ?? 0, color: '#6366f1' },
    { stage: 'Applied to Jobs', count: f.users_applied ?? 0, color: '#a855f7' },
    { stage: 'Got Interviews', count: f.users_interview ?? 0, color: '#ec4899' },
    { stage: 'Got Offers', count: f.users_offer ?? 0, color: '#10b981' },
    { stage: 'Upgraded to Pro', count: f.users_upgraded ?? 0, color: '#22c55e' },
  ];

  const maxCount = funnelStages[0].count || 1;
  const activationRate = f.total_users > 0 ? ((f.users_with_profile / f.total_users) * 100).toFixed(1) : 0;
  const trackingRate = f.users_with_profile > 0 ? ((f.users_tracking_jobs / f.users_with_profile) * 100).toFixed(1) : 0;
  const paidConv = f.total_users > 0 ? ((f.users_upgraded / f.total_users) * 100).toFixed(1) : 0;

  if (error) return <div className="p-8 text-center text-red-400">Failed to load data: {error}</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Conversion Funnel</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real user funnel from your database
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="Profile Completion" value={parseFloat(activationRate)} format="percent" icon={UserCheck} accent={COLORS.blue} sparkData={spark7(parseFloat(activationRate), 5)} />
            <KPICard title="Signup → Tracking" value={parseFloat(trackingRate)} format="percent" icon={RefreshCw} accent={COLORS.purple} sparkData={spark7(parseFloat(trackingRate), 5)} />
            <KPICard title="Free-to-Paid" value={parseFloat(paidConv)} format="percent" icon={CreditCard} accent={COLORS.green} sparkData={spark7(parseFloat(paidConv), 1)} />
            <KPICard title="Pro Users" value={f.users_upgraded ?? 0} icon={Star} accent={COLORS.amber} sparkData={spark7(f.users_upgraded ?? 0, 3)} />
          </>
        )}
      </div>

      <ChartCard title="Conversion Funnel" subtitle="Real user progression through product stages">
        {loading ? <Skeleton className="h-[400px]" /> : (
        <>
        <div className="space-y-1 py-2">
          {funnelStages.map((stage, i) => {
            const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const stepConv = i === 0 || funnelStages[i-1].count === 0 ? null
              : ((stage.count / funnelStages[i-1].count) * 100).toFixed(1);

            return (
              <div key={stage.stage}>
                {/* Step-to-step conversion arrow */}
                {stepConv !== null && (
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-px h-3 bg-white/10" />
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          parseFloat(stepConv) >= 70
                            ? 'bg-green-500/20 text-green-400'
                            : parseFloat(stepConv) >= 50
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {stepConv}% retained
                      </span>
                      <div className="w-px h-3 bg-white/10" />
                    </div>
                  </div>
                )}

                {/* Funnel Bar Row */}
                <div className="flex items-center gap-3">
                  {/* Left: stage name */}
                  <div className="w-44 flex-shrink-0 text-right">
                    <span className="text-xs text-gray-400 font-medium">{stage.stage}</span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 flex justify-center">
                    <div
                      className="relative flex items-center justify-center rounded-md transition-all"
                      style={{
                        width: `${widthPct}%`,
                        minWidth: 40,
                        height: 36,
                        background: `${stage.color}22`,
                        borderLeft: `3px solid ${stage.color}`,
                        borderRight: `3px solid ${stage.color}`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="w-20 flex-shrink-0">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: stage.color }}>
                      {maxCount > 0 ? ((stage.count / maxCount) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-400">Signup-to-paid conversion</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {f.users_upgraded ?? 0} Pro users from {f.total_users ?? 0} total signups
            </p>
          </div>
          <span className="text-3xl font-bold text-green-400">{paidConv}%</span>
        </div>
        </>
        )}
      </ChartCard>
    </div>
  );
}
