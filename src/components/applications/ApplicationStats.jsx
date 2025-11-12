import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Send, Calendar, Trophy } from "lucide-react";

export default function ApplicationStats({ stats }) {
  const statItems = [
    { label: 'Saved', value: stats.saved, icon: Clock, color: 'from-gray-400 to-gray-500' },
    { label: 'Applied', value: stats.applied, icon: Send, color: 'from-blue-400 to-blue-500' },
    { label: 'Interviews', value: stats.interview, icon: Calendar, color: 'from-purple-400 to-purple-500' },
    { label: 'Offers', value: stats.offer, icon: Trophy, color: 'from-green-400 to-green-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
      {statItems.map((item) => (
        <Card key={item.label} className="border border-gray-100">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-2">{item.label}</p>
            <p className="text-3xl font-semibold text-gray-900">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}