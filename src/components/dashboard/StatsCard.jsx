import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Maps the gradient prop (from Dashboard) to explicit accent classes.
// Full strings are required so Tailwind JIT can detect them at scan time.
const ACCENT = {
  "from-blue-500":   { bar: "bg-blue-500",   iconBg: "bg-blue-500/10",   iconColor: "text-blue-400"   },
  "from-purple-500": { bar: "bg-purple-500", iconBg: "bg-purple-500/10", iconColor: "text-purple-400" },
  "from-orange-500": { bar: "bg-orange-500", iconBg: "bg-orange-500/10", iconColor: "text-orange-400" },
  "from-green-500":  { bar: "bg-green-500",  iconBg: "bg-green-500/10",  iconColor: "text-green-400"  },
};

export default function StatsCard({ title, value, icon: Icon, gradient, isLoading }) {
  const fromKey = gradient?.split(' ')[0] ?? "from-blue-500";
  const accent  = ACCENT[fromKey] ?? ACCENT["from-blue-500"];

  return (
    <Card className="border border-white/5 overflow-hidden relative group">
      {/* Thin top accent line — Linear-style card indicator */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent.bar} opacity-70 group-hover:opacity-100 transition-opacity`} />

      <CardContent className="p-5 pt-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            {/* Icon chip */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${accent.iconBg}`}>
              {Icon && <Icon className={`w-4 h-4 ${accent.iconColor}`} strokeWidth={2} />}
            </div>

            {/* Value */}
            <p className="text-2xl font-semibold text-white tracking-tight tabular-nums">
              {value}
            </p>

            {/* Label */}
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mt-1">
              {title}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
