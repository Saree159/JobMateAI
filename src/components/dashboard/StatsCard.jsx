import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const ACCENT = {
  "from-blue-500":   { bar: "from-blue-500 to-cyan-400",    iconBg: "bg-blue-50",   iconColor: "text-blue-600",   shadow: "shadow-blue-100"   },
  "from-purple-500": { bar: "from-purple-500 to-pink-400",  iconBg: "bg-purple-50", iconColor: "text-purple-600", shadow: "shadow-purple-100" },
  "from-orange-500": { bar: "from-orange-500 to-red-400",   iconBg: "bg-orange-50", iconColor: "text-orange-600", shadow: "shadow-orange-100" },
  "from-green-500":  { bar: "from-green-500 to-emerald-400",iconBg: "bg-emerald-50",iconColor: "text-emerald-600",shadow: "shadow-emerald-100"},
};

export default function StatsCard({ title, value, icon: Icon, gradient, isLoading }) {
  const fromKey = gradient?.split(' ')[0] ?? "from-blue-500";
  const accent  = ACCENT[fromKey] ?? ACCENT["from-blue-500"];

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <Skeleton className="h-8 w-8 rounded-lg mb-4" />
        <Skeleton className="h-8 w-12 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className={`
      relative bg-white border border-gray-100 rounded-xl p-5 overflow-hidden
      transition-all duration-200 hover:shadow-lg ${accent.shadow} hover:border-gray-200
      group cursor-default shadow-sm
    `}>
      {/* Gradient top bar */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r ${accent.bar} opacity-70 group-hover:opacity-100 transition-opacity`} />

      {/* Subtle background tint */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${accent.bar} opacity-[0.06] group-hover:opacity-[0.1] transition-opacity blur-xl`} />

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${accent.iconBg} shadow-sm`}>
        {Icon && <Icon className={`w-4 h-4 ${accent.iconColor}`} strokeWidth={2} />}
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums leading-none mb-1.5">
        {value}
      </p>

      {/* Label */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
        {title}
      </p>
    </div>
  );
}
