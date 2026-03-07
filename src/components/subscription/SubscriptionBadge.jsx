import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";

export default function SubscriptionBadge({ tier, className = "" }) {
  const isPro = tier === 'pro';
  
  return (
    <Badge 
      className={`${
        isPro 
          ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white border-0' 
          : 'bg-white/10 text-gray-300 border-gray-300'
      } ${className}`}
    >
      {isPro ? (
        <>
          <Crown className="w-3 h-3 mr-1" />
          Pro
        </>
      ) : (
        <>
          <Sparkles className="w-3 h-3 mr-1" />
          Free
        </>
      )}
    </Badge>
  );
}