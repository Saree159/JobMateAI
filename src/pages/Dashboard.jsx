import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Briefcase, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "../components/dashboard/StatsCard";
import TopMatchesList from "../components/dashboard/TopMatchesList";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['applications', user?.id],
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
    staleTime: 30 * 60 * 1000, // 30 min — matches cache lifetime
  });

  const stats = {
    totalJobs: applications.length,
    saved: applications.filter(a => a.status === 'saved').length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviews: applications.filter(a => a.status === 'interview').length,
  };

  const isLoading = appsLoading;
  const topMatches = topMatchesData?.jobs || [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header with modern gradient */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent mb-2">
          {t('dashboard.welcomeBack', { name: user?.full_name?.split(' ')[0] || 'there' })}
        </h1>
        <p className="text-gray-600 text-lg">
          {user?.target_role ? t('dashboard.findingJobs', { role: user.target_role }) : t('dashboard.commandCenter')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Top Matches */}
        <div className="lg:col-span-2">
          <TopMatchesList
            jobs={topMatches}
            isLoading={matchesLoading}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Completion */}
          {user && (
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  {t('dashboard.yourProfile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.target_role && (
                  <div>
                    <p className="text-sm text-gray-600">{t('dashboard.targetRole')}</p>
                    <p className="font-semibold text-gray-900">{user.target_role}</p>
                  </div>
                )}
                {user.skills && user.skills.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('dashboard.skills')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills.slice(0, 6).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-white text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {user.skills.length > 6 && (
                        <Badge variant="secondary" className="bg-white text-xs">
                          {t('dashboard.moreSkills', { count: user.skills.length - 6 })}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => navigate(createPageUrl("Profile"))}
                >
                  {t('dashboard.editProfile')}
                  <ArrowRight className="w-4 h-4 ml-2" />
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