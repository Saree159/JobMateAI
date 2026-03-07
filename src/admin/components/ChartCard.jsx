import React from 'react';

export default function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-card border border-white/5 rounded-2xl p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
