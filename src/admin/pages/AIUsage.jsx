import React from 'react';
import { Cpu, Zap, Activity } from 'lucide-react';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import { useAdminStats } from '../useAdminStats';
import { spark7 } from '../mockData';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

const FEATURE_LABELS = {
  cover_letter: 'Cover Letter',
  interview_questions: 'Interview Q&A',
  salary_estimate: 'Salary Estimate',
  resume_rewrite: 'Resume Rewrite',
  resume_evaluation: 'Resume Review',
  gap_analysis: 'Gap Analysis',
};

export default function AIUsage() {
  const { stats, loading, error } = useAdminStats();
  const ai = stats?.ai_usage ?? {};

  const totalCalls = ai.total_calls ?? 0;
  const totalTokensOut = ai.total_tokens_out ?? 0;
  const totalCost = ai.total_cost_usd ?? 0;
  const byFeature = ai.by_feature ?? [];

  if (error) return <div className="p-8 text-center text-red-400">Failed to load data: {error}</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Usage</h1>
        <p className="text-sm text-gray-400 mt-1">Real OpenAI calls logged per request · all features</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="Total AI Calls" value={totalCalls} icon={Zap} accent="#3b82f6" sparkData={spark7(totalCalls, 3)} />
            <KPICard title="Tokens Generated" value={totalTokensOut} icon={Cpu} accent="#22c55e" sparkData={spark7(totalTokensOut, 200)} />
            <KPICard title="Total Cost (USD)" value={`$${totalCost.toFixed(4)}`} icon={Activity} accent="#f59e0b" />
          </>
        )}
      </div>

      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white">AI Calls by Feature</p>
          <p className="text-xs text-gray-500 mt-0.5">Every OpenAI API call is logged automatically</p>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : byFeature.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            No AI calls logged yet. Generate a cover letter, run a resume rewrite, or use gap analysis to start tracking.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5">
                <th className="text-left px-5 py-3 font-medium">Feature</th>
                <th className="text-right px-4 py-3 font-medium">Calls</th>
                <th className="text-right px-4 py-3 font-medium">Tokens In</th>
                <th className="text-right px-4 py-3 font-medium">Tokens Out</th>
                <th className="text-right px-4 py-3 font-medium">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {byFeature.map(row => (
                <tr key={row.feature} className="hover:bg-white/3">
                  <td className="px-5 py-3.5 font-medium text-white">{FEATURE_LABELS[row.feature] ?? row.feature}</td>
                  <td className="px-4 py-3.5 text-right text-blue-400 font-semibold">{row.calls.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-gray-400">{(row.tokens_in ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-gray-400">{(row.tokens_out ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-yellow-400 font-medium">${row.cost_usd.toFixed(4)}</td>
                </tr>
              ))}
              <tr className="border-t border-white/10 bg-white/3">
                <td className="px-5 py-3.5 font-bold text-white">Total</td>
                <td className="px-4 py-3.5 text-right font-bold text-white">{totalCalls.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-semibold text-white">{(ai.total_tokens_in ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-semibold text-white">{totalTokensOut.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-bold text-yellow-400">${totalCost.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
