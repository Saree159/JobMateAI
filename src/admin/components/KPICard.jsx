import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { spark7 } from '../mockData';

export default function KPICard({ title, value, format = 'number', change, changeLabel, icon: Icon, iconColor = 'text-blue-400', sparkData, accent = '#3b82f6', suffix = '' }) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change == null;

  const displayValue = () => {
    if (format === 'currency') return `₪${Number(value).toLocaleString()}`;
    if (format === 'usd') return `$${Number(value).toLocaleString()}`;
    if (format === 'percent') return `${value}%`;
    if (format === 'k') return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
    if (format === 'M') return value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value);
    return Number(value).toLocaleString() + suffix;
  };

  const spark = sparkData || spark7(Number(value), Number(value) * 0.12);

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 leading-none">{displayValue()}</p>
        </div>
        {Icon && (
          <div className={`p-2 rounded-xl bg-white/5 ${iconColor} group-hover:scale-105 transition-transform`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Change */}
      {change != null && (
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
            isNeutral ? 'bg-gray-500/20 text-gray-400' :
            isPositive ? 'bg-green-500/20 text-green-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isNeutral ? '0%' : `${isPositive ? '+' : ''}${change}%`}
          </span>
          <span className="text-xs text-gray-500">{changeLabel || 'vs last period'}</span>
        </div>
      )}
    </div>
  );
}
