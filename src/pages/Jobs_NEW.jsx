import React, { useState } from "react";
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
import AddJobDialog from "../components/jobs/AddJobDialog";
import JobCard from "../components/jobs/JobCard";
import JobFilters from "../components/jobs/JobFilters";
import UpgradePrompt from "../components/subscription/UpgradePrompt";

export default function Jobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
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
      
      return matchesSearch && matchesLocation;
    })
    .map(job => ({
      ...job,
      matchScore: calculateMatchScore(job),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  const viewsRemaining = null; // Daily limits disabled in standalone version

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            My Job Applications
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Job
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="border border-gray-100 mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by title, company, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <JobFilters filters={filters} setFilters={setFilters} />
          </div>
        </CardContent>
      </Card>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="border border-gray-100">
          <CardContent className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No jobs yet</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filters.location ? 'Try adjusting your search filters' : 'Start by adding jobs you want to apply to'}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Job
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
