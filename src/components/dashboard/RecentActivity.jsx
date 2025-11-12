import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, Send, Calendar } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  saved: { label: 'Saved', icon: Clock, color: 'bg-gray-100 text-gray-700' },
  applied: { label: 'Applied', icon: Send, color: 'bg-blue-100 text-blue-700' },
  interview: { label: 'Interview', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  offer: { label: 'Offer', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', icon: CheckCircle2, color: 'bg-red-100 text-red-700' },
};

export default function RecentActivity({ applications, isLoading }) {
  const recentApps = applications.slice(0, 5);

  if (isLoading) {
    return (
      <Card className="border border-gray-100">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentApps.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentApps.map((app) => {
              const status = statusConfig[app.status];
              const StatusIcon = status.icon;
              
              return (
                <div key={app.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Application {status.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(app.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}