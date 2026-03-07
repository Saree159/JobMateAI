import React from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import { useAdminStats } from '../useAdminStats';
import { Zap, DollarSign, TrendingDown, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#64748b'];

const FEATURE_LABELS = {
  cover_letter: 'Cover Letters',
  interview_questions: 'Interview Q&A',
  salary_estimate: 'Salary Estimate',
  resume_rewrite: 'Resume Rewrite',
  resume_evaluation: 'Resume Review',
  gap_analysis: 'Gap Analysis',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

function round4(n) {
  return Math.round((n || 0) * 10000) / 10000;
}

export default function TokenCosts() {
  const { stats, loading } = useAdminStats();
  const ai = stats?.ai_usage ?? {};

  const totalCalls = ai.total_calls ?? 0;
  const totalTokensIn = ai.total_tokens_in ?? 0;
  const totalTokensOut = ai.total_tokens_out ?? 0;
  const totalCost = ai.total_cost_usd ?? 0;
  const costPerCall = totalCalls > 0 ? (totalCost / totalCalls).toFixed(4) : '0.0000';

  const byFeature = (ai.by_feature ?? []).map((row, i) => ({
    ...row,
    label: FEATURE_LABELS[row.feature] ?? row.feature,
    color: COLORS[i % COLORS.length],
    costPerReq: row.calls > 0 ? (row.cost_usd / row.calls).toFixed(5) : '0',
  }));

  const byModel = (ai.by_model ?? []).map((row, i) => ({
    name: row.model,
    value: round4(row.cost_usd),
    color: COLORS[i % COLORS.length],
  }));

  const dailyCost = ai.daily ?? [];

  return (
    <div className="p-6 space-y-6 min-h-full">
      <div>
        <h2 className="text-xl font-bold text-white">Token Costs</h2>
        <p className="text-sm text-gray-400 mt-0.5">Real OpenAI usage logged per API call · gpt-4o-mini pricing</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />) : (
          <>
            <KPICard title="Total AI Calls" value={totalCalls} format="number" icon={Zap} accent="#3b82f6" />
            <KPICard title="Total Cost (USD)" value={totalCost} format="number" icon={DollarSign} accent="#f59e0b" />
            <KPICard title="Cost / Call (USD)" value={parseFloat(costPerCall)} format="number" icon={TrendingDown} accent="#22c55e" />
            <KPICard title="Tokens Out" value={totalTokensOut} format="number" icon={Activity} accent="#a855f7" />
          </>
        )}
      </div>

      {/* Daily cost area chart */}
      <ChartCard title="Daily Token Usage & Cost" subtitle="Last 30 days — real logged data">
        {loading ? <Skeleton className="h-[260px]" /> : dailyCost.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-gray-500 text-sm">
            No AI calls logged yet. Generate a cover letter or run a resume rewrite to start tracking.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyCost} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(v, n) => n === 'cost' ? [`$${v}`, 'Cost'] : [v.toLocaleString(), 'Tokens']}
              />
              <Area type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} fill="url(#costGrad)" name="cost" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by feature bar */}
        <ChartCard title="Cost by Feature" subtitle="Total spend per product feature (USD)">
          {loading ? <Skeleton className="h-[240px]" /> : byFeature.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byFeature} layout="vertical" margin={{ top: 4, right: 24, left: 120, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={v => [`$${v}`, 'Cost']}
                />
                <Bar dataKey="cost_usd" radius={[0, 4, 4, 0]}>
                  {byFeature.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Cost by model pie */}
        <ChartCard title="Cost by Model" subtitle="Spend breakdown per OpenAI model">
          {loading ? <Skeleton className="h-[240px]" /> : byModel.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byModel} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                  {byModel.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={v => [`$${v}`, 'Cost']}
                />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Detailed feature table */}
      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white">Cost Efficiency by Feature</p>
          <p className="text-xs text-gray-500 mt-0.5">Token usage and cost per request — all from real logged data</p>
        </div>
        {loading ? <Skeleton className="h-[200px] m-4" /> : byFeature.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No AI usage logged yet. Token tracking starts automatically once users generate cover letters, resume rewrites, or other AI features.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-white/5">
                  <th className="text-left px-5 py-3 font-medium">Feature</th>
                  <th className="text-right px-4 py-3 font-medium">Calls</th>
                  <th className="text-right px-4 py-3 font-medium">Tokens In</th>
                  <th className="text-right px-4 py-3 font-medium">Tokens Out</th>
                  <th className="text-right px-4 py-3 font-medium">Total Cost</th>
                  <th className="text-right px-4 py-3 font-medium">Cost / Call</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {byFeature.map((row) => (
                  <tr key={row.feature} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">{row.label}</td>
                    <td className="px-4 py-3.5 text-right text-gray-300">{row.calls.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-gray-300">{(row.tokens_in ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-gray-300">{(row.tokens_out ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-yellow-400 font-medium">${row.cost_usd.toFixed(4)}</td>
                    <td className="px-4 py-3.5 text-right text-gray-300">${row.costPerReq}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 bg-white/3">
                  <td className="px-5 py-3.5 font-bold text-white">Total</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-white">{totalCalls.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-white">{totalTokensIn.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-white">{totalTokensOut.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-yellow-400">${totalCost.toFixed(4)}</td>
                  <td className="px-4 py-3.5" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
