import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCard({ title, value, icon: Icon, gradient, isLoading }) {
  return (
    <Card className="border border-gray-100">
      <CardContent className="p-6">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">{title}</p>
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}