import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  Search, 
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import AddJobDialog from "../components/jobs/AddJobDialog";
import JobCard from "../components/jobs/JobCard";
import JobFilters from "../components/jobs/JobFilters";
import UpgradePrompt from "../components/subscription/UpgradePrompt";

export default function Jobs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    job_type: 'all',
    experience_level: 'all',
    location: '',
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await jobApi.listByUser(user.id);
    },
    enabled: !!user?.id,
  });

  const checkDailyLimit = () => {
    if (!user) return false;
    
    const isPro = user.subscription_tier === 'pro';
    if (isPro) return false;
    
    // For the standalone version, you could implement daily limits
    // by tracking views in the backend or localStorage
    return false; // Disabled for now
  };

  const handleJobClick = (job) => {
    navigate(createPageUrl("JobDetails") + `?id=${job.id}`);
  };

  const calculateMatchScore = (job) => {
    // Use server-calculated match score if available
    if (job.match_score) return job.match_score;
    
    // Fallback client-side calculation
    if (!user?.skills || !user.skills.length) return 0;
    
    const skills = typeof user.skills === 'string' ? user.skills.split(',').map(s => s.trim()) : user.skills;
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matches = skills.filter(skill => 
      jobText.includes(skill.toLowerCase())
    );
    
    return Math.min(100, Math.round((matches.length / skills.length) * 100));
  };

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = !searchQuery || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesLocation = !filters.location || 
        job.location.toLowerCase().includes(filters.location.toLowerCase());
      
      const matchesStatus = filters.status === 'all' || job.status === filters.status;
      
      return matchesSearch && matchesLocation && matchesStatus;
    })
    .map(job => ({
      ...job,
      matchScore: calculateMatchScore(job),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  const viewsRemaining = null; // Daily limits disabled in standalone version

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {t('jobs.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('jobs.jobsSaved', { count: filteredJobs.length })}
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('jobs.addJob')}
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-card border border-white/5 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <Input
              placeholder={t('jobs.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white/5 border-white/10 focus:border-blue-500/50 text-sm"
            />
          </div>
          <JobFilters filters={filters} setFilters={setFilters} />
        </div>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-white/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="border border-white/5">
          <CardContent className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">{t('jobs.noJobsYet')}</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filters.location ? t('jobs.adjustFilters') : t('jobs.startAdding')}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('jobs.addFirstJob')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onView={() => handleJobClick(job)}
            />
          ))}
        </div>
      )}

      <AddJobDialog 
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />

      <UpgradePrompt
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="job views"
        limit="You've reached your daily limit."
      />
    </div>
  );
}
