import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const ACCENT = {
  "from-blue-500":   {
    bar:       "from-blue-500 to-cyan-400",
    iconBg:    "bg-blue-500/10",
    iconColor: "text-blue-400",
    glow:      "shadow-blue-500/10",
  },
  "from-purple-500": {
    bar:       "from-purple-500 to-pink-400",
    iconBg:    "bg-purple-500/10",
    iconColor: "text-purple-400",
    glow:      "shadow-purple-500/10",
  },
  "from-orange-500": {
    bar:       "from-orange-500 to-red-400",
    iconBg:    "bg-orange-500/10",
    iconColor: "text-orange-400",
    glow:      "shadow-orange-500/10",
  },
  "from-green-500":  {
    bar:       "from-green-500 to-emerald-400",
    iconBg:    "bg-green-500/10",
    iconColor: "text-green-400",
    glow:      "shadow-green-500/10",
  },
};

export default function StatsCard({ title, value, icon: Icon, gradient, isLoading }) {
  const fromKey = gradient?.split(' ')[0] ?? "from-blue-500";
  const accent  = ACCENT[fromKey] ?? ACCENT["from-blue-500"];

  if (isLoading) {
    return (
      <div className="bg-card border border-white/5 rounded-xl p-5 overflow-hidden">
        <Skeleton className="h-8 w-8 rounded-lg mb-4" />
        <Skeleton className="h-8 w-12 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className={`
      relative bg-card border border-white/5 rounded-xl p-5 overflow-hidden
      transition-all duration-200 hover:border-white/10 hover:shadow-xl ${accent.glow}
      group cursor-default
    `}>
      {/* Gradient top bar */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r ${accent.bar} opacity-60 group-hover:opacity-100 transition-opacity`} />

      {/* Subtle background glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${accent.bar} opacity-[0.04] group-hover:opacity-[0.07] transition-opacity blur-xl`} />

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${accent.iconBg} shadow-sm`}>
        {Icon && <Icon className={`w-4.5 h-4.5 ${accent.iconColor}`} strokeWidth={2} />}
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-white tracking-tight tabular-nums leading-none mb-1.5">
        {value}
      </p>

      {/* Label */}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
        {title}
      </p>
    </div>
  );
}
