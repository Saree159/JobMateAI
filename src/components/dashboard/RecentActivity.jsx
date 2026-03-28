import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Send, Calendar, CheckCircle2, XCircle, Bookmark } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  saved:     { label: 'Saved',     Icon: Bookmark,     dot: 'bg-gray-500',   text: 'text-gray-500'   },
  applied:   { label: 'Applied',   Icon: Send,         dot: 'bg-blue-500',   text: 'text-blue-600'   },
  interview: { label: 'Interview', Icon: Calendar,     dot: 'bg-purple-500', text: 'text-purple-600' },
  offer:     { label: 'Offer',     Icon: CheckCircle2, dot: 'bg-green-500',  text: 'text-green-600'  },
  rejected:  { label: 'Rejected',  Icon: XCircle,      dot: 'bg-red-500',    text: 'text-red-600'    },
};

export default function RecentActivity({ applications, isLoading }) {
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 items-start">
              <Skeleton className="h-4 w-4 rounded-full mt-1 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">
          Recent Activity
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-1">
        {recentApps.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No activity yet</p>
            <p className="text-xs text-gray-400 mt-1">Jobs you track will appear here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />

            <div className="space-y-4">
              {recentApps.map((app, idx) => {
                const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.saved;
                const { Icon } = cfg;

                return (
                  <div key={app.id ?? idx} className="flex gap-3 items-start group">
                    {/* Timeline dot */}
                    <div className={`relative z-10 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 ${cfg.dot}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate leading-snug">
                        {app.title ?? 'Untitled position'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {app.company && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="text-xs text-gray-500 truncate">{app.company}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {app.created_at ? format(new Date(app.created_at), 'MMM d') : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
