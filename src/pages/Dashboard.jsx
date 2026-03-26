import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Target,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCard from "../components/dashboard/StatsCard";
import TopMatchesList from "../components/dashboard/TopMatchesList";
import RecentActivity from "../components/dashboard/RecentActivity";

// Derive a time-aware greeting without needing an i18n key
function getGreeting(firstName) {
  const h = new Date().getHours();
  const salutation =
    h < 12 ? "Good morning" :
    h < 17 ? "Good afternoon" :
              "Good evening";
  return firstName ? `${salutation}, ${firstName}` : salutation;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshMatches = async () => {
    setIsRefreshing(true);
    try {
      const result = await jobApi.topMatches(user.id, true);
      queryClient.setQueryData(['top-matches', user?.id], result);
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await jobApi.listByUser(user.id);
    },
    enabled: !!user?.id,
  });

  const { data: topMatchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['top-matches', user?.id],
    queryFn: () => jobApi.topMatches(user.id),
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });

  const stats = {
    totalJobs:  applications.length,
    saved:      applications.filter(a => a.status === 'saved').length,
    applied:    applications.filter(a => a.status === 'applied').length,
    interviews: applications.filter(a => a.status === 'interview').length,
  };

  const isLoading  = appsLoading;
  const topMatches = topMatchesData?.jobs || [];
  const firstName  = user?.full_name?.split(' ')[0] || null;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          <span className="text-gray-900">{getGreeting(firstName).split(',')[0]}</span>
          {firstName && <span className="text-blue-600">{`, ${firstName}`}</span>}
        </h1>
        <p className="text-sm text-gray-500 mt-1.5">
          {user?.target_role
            ? t('dashboard.findingJobs', { role: user.target_role })
            : t('dashboard.commandCenter')}
        </p>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
        <StatsCard
          title={t('dashboard.availableJobs')}
          value={stats.totalJobs}
          icon={Briefcase}
          gradient="from-blue-500 to-cyan-500"
          isLoading={isLoading}
        />
        <StatsCard
          title={t('dashboard.saved')}
          value={stats.saved}
          icon={Clock}
          gradient="from-purple-500 to-pink-500"
          isLoading={isLoading}
        />
        <StatsCard
          title={t('dashboard.applied')}
          value={stats.applied}
          icon={TrendingUp}
          gradient="from-orange-500 to-red-500"
          isLoading={isLoading}
        />
        <StatsCard
          title={t('dashboard.interviews')}
          value={stats.interviews}
          icon={CheckCircle2}
          gradient="from-green-500 to-emerald-500"
          isLoading={isLoading}
        />
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">

        {/* Top Matches — takes 2/3 width */}
        <div className="lg:col-span-2 min-w-0">
          <TopMatchesList
            jobs={topMatches}
            isLoading={matchesLoading}
            onRefresh={handleRefreshMatches}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Sidebar — takes 1/3 width */}
        <div className="space-y-4 min-w-0">

          {/* Profile card */}
          {user && (
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  {t('dashboard.yourProfile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.target_role && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-1">
                      {t('dashboard.targetRole')}
                    </p>
                    <p className="text-sm font-medium text-gray-900">{user.target_role}</p>
                  </div>
                )}
                {user.skills && user.skills.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-2">
                      {t('dashboard.skills')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills.slice(0, 6).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] font-normal h-5 px-1.5">
                          {skill}
                        </Badge>
                      ))}
                      {user.skills.length > 6 && (
                        <Badge variant="secondary" className="text-[10px] font-normal h-5 px-1.5 text-gray-500">
                          +{user.skills.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate(createPageUrl("Profile"))}
                >
                  {t('dashboard.editProfile')}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <RecentActivity applications={applications} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
