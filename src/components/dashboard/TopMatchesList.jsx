import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, MapPin, Building2, ArrowRight, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TopMatchesList({ jobs, applications, userSkills, isLoading }) {
  const navigate = useNavigate();

  const calculateMatchScore = (job) => {
    if (!userSkills || userSkills.length === 0) return 0;
    
    const jobText = `${job.title} ${job.description} ${job.requirements || ''} ${job.tags?.join(' ') || ''}`.toLowerCase();
    const matches = userSkills.filter(skill => 
      jobText.includes(skill.toLowerCase())
    );
    
    return Math.min(100, Math.round((matches.length / userSkills.length) * 100));
  };

  const jobsWithScores = jobs
    .map(job => ({
      ...job,
      matchScore: calculateMatchScore(job)
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  const isJobSaved = (jobId) => {
    return applications.some(app => app.job_id === jobId);
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-100">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Top Matches for You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobsWithScores.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No jobs available yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(createPageUrl("Jobs"))}
            >
              Browse All Jobs
            </Button>
          </div>
        ) : (
          jobsWithScores.map((job) => (
            <div
              key={job.id}
              className="p-5 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer bg-white"
              onClick={() => navigate(createPageUrl("JobDetails") + `?id=${job.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-gray-900">{job.title}</h3>
                    {isJobSaved(job.id) && (
                      <Bookmark className="w-4 h-4 fill-indigo-600 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    job.matchScore >= 70 ? 'text-green-600' : 
                    job.matchScore >= 50 ? 'text-yellow-600' : 
                    'text-gray-600'
                  }`}>
                    {job.matchScore}%
                  </div>
                  <p className="text-xs text-gray-500">Match</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                {job.description}
              </p>
              
              {job.tags && job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.tags.slice(0, 4).map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {job.tags.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{job.tags.length - 4}
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {job.job_type && (
                    <Badge variant="outline" className="text-xs">
                      {job.job_type}
                    </Badge>
                  )}
                  {job.experience_level && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {job.experience_level}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(createPageUrl("JobDetails") + `?id=${job.id}`);
                  }}
                >
                  View Details
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}