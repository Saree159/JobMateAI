import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Briefcase, 
  DollarSign,
  ExternalLink,
  Bookmark,
  Sparkles,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CoverLetterGenerator from "../components/jobdetails/CoverLetterGenerator";
import SaveJobButton from "../components/jobdetails/SaveJobButton";

export default function JobDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Application.filter({ user_email: user.email });
    },
  });

  const calculateMatchScore = () => {
    if (!user?.skills || !job) return 0;
    
    const jobText = `${job.title} ${job.description} ${job.requirements || ''} ${job.tags?.join(' ') || ''}`.toLowerCase();
    const matches = user.skills.filter(skill => 
      jobText.includes(skill.toLowerCase())
    );
    
    return Math.min(100, Math.round((matches.length / user.skills.length) * 100));
  };

  const existingApplication = applications.find(app => app.job_id === jobId);
  const matchScore = calculateMatchScore();

  if (jobLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>Job not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Jobs"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Jobs
      </Button>

      {/* Job Header */}
      <Card className="border border-gray-100 mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-gray-600">
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
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {job.job_type && (
                  <Badge variant="secondary">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {job.job_type}
                  </Badge>
                )}
                {job.experience_level && (
                  <Badge variant="secondary" className="capitalize">
                    {job.experience_level}
                  </Badge>
                )}
                {job.salary_range && (
                  <Badge variant="secondary">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {job.salary_range}
                  </Badge>
                )}
              </div>
            </div>

            {/* Match Score */}
            <div className="text-center bg-gray-50 p-6 rounded-lg">
              <div className={`text-4xl font-semibold mb-1 ${
                matchScore >= 70 ? 'text-green-600' : 
                matchScore >= 50 ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {matchScore}%
              </div>
              <p className="text-sm text-gray-500">
                Match Score
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="font-semibold">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && (
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle className="font-semibold">Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
              </CardContent>
            </Card>
          )}

          {/* Skills Match */}
          {job.tags && job.tags.length > 0 && (
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle className="font-semibold">Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, idx) => {
                    const hasSkill = user?.skills?.some(s => 
                      s.toLowerCase() === tag.toLowerCase()
                    );
                    return (
                      <Badge 
                        key={idx} 
                        variant={hasSkill ? "default" : "secondary"}
                        className={hasSkill ? "bg-green-100 text-green-800" : ""}
                      >
                        {hasSkill && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cover Letter Generator */}
          <CoverLetterGenerator 
            job={job} 
            user={user}
            applicationId={existingApplication?.id}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="border border-gray-100">
            <CardContent className="p-6 space-y-3">
              {job.apply_url && (
                <a 
                  href={job.apply_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Apply Now
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              )}
              <SaveJobButton 
                job={job}
                existingApplication={existingApplication}
                matchScore={matchScore}
              />
            </CardContent>
          </Card>

          {/* Job Info */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Source</p>
                <p className="font-medium capitalize">{job.source}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-600">Posted</p>
                <p className="font-medium">
                  {new Date(job.created_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}