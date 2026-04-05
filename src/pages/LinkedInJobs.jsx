import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Linkedin, AlertCircle, MapPin, Building2, ExternalLink, Briefcase, Bookmark, CheckCircle2 } from "lucide-react";
import ScraperLoader from "@/components/jobs/ScraperLoader";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { jobApi } from "@/api/jobmate";

function DescriptionPreview({ text }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n").filter(Boolean);
  const preview = lines.slice(0, 4).join("\n");
  const hasMore = lines.length > 4;
  return (
    <div className="text-xs text-gray-400 leading-relaxed">
      <p className="whitespace-pre-line break-words overflow-hidden">{expanded ? text : preview}</p>
      {hasMore && (
        <button
          className="text-blue-600 hover:text-blue-700 mt-1 font-medium"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;   // jobs shown per "Load More" click
const FETCH_SIZE = 25;  // jobs fetched from backend per request

export default function LinkedInJobs() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [role, setRole] = useState(user?.target_role || "");
  const [location, setLocation] = useState(user?.location_preference || "");
  const [jobs, setJobs] = useState([]);          // all fetched jobs
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE); // how many to display
  const [fetchStart, setFetchStart] = useState(0);  // next backend offset to fetch
  const [hasMore, setHasMore] = useState(false);    // backend might have more
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [savedUrls, setSavedUrls] = useState(new Set());

  const saveJobMutation = useMutation({
    mutationFn: (job) => jobApi.create(user.id, {
      title: job.title,
      company: job.company || 'Unknown',
      location: job.location || '',
      description: job.description || '',
      url: job.url || '',
      job_type: job.job_type || '',
      status: 'saved',
      source: 'linkedin',
    }),
    onSuccess: (saved, job) => {
      setSavedUrls(prev => new Set([...prev, job.url]));
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`"${saved.title}" saved to your jobs`);
    },
    onError: () => toast.error('Failed to save job'),
  });

  const fetchJobs = async (start, append = false) => {
    const params = new URLSearchParams({ role: role.trim(), start });
    if (location.trim()) params.set("location", location.trim());
    if (user?.id) params.set("user_id", user.id);
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/jobs/scrape/linkedin?${params}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Failed to fetch jobs");
    }
    const data = await response.json();
    const newJobs = data.jobs || [];
    setJobs(prev => append ? [...prev, ...newJobs] : newJobs);
    setFetchStart(start + newJobs.length);
    setHasMore(data.has_more || false);
    return newJobs;
  };

  const handleSearch = async () => {
    if (!role.trim()) {
      setError("Please enter a job role to search.");
      return;
    }
    setError("");
    setIsLoading(true);
    setSearched(true);
    setVisibleCount(PAGE_SIZE);
    setFetchStart(0);
    setHasMore(false);
    try {
      await fetchJobs(0, false);
    } catch (err) {
      setError(err.message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    // If we have more fetched jobs to show, just reveal them
    if (visibleCount < jobs.length) {
      setVisibleCount(prev => prev + PAGE_SIZE);
      return;
    }
    // Otherwise fetch next batch from backend
    if (!hasMore) return;
    setIsLoadingMore(true);
    try {
      const newJobs = await fetchJobs(fetchStart, true);
      if (newJobs.length > 0) {
        setVisibleCount(prev => prev + PAGE_SIZE);
      }
    } catch (err) {
      toast.error("Failed to load more jobs");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Linkedin className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">LinkedIn Jobs</h1>
          </div>
          <p className="text-gray-400">
            Search LinkedIn's public job listings by role and location
          </p>
        </div>

        {/* Search Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Role / Keywords
                </Label>
                <Input
                  placeholder="e.g. Frontend Developer, Python Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </Label>
                <Input
                  placeholder="e.g. Tel Aviv, Remote, New York"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search LinkedIn
            </Button>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && <ScraperLoader message="Searching LinkedIn… this may take a moment" />}

        {/* Error */}
        {error && !isLoading && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.includes("blocking") || error.includes("No jobs found")
                ? "LinkedIn blocked the request or returned no results. Try a different role or location, or try again in a few minutes."
                : error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {!isLoading && searched && !error && jobs.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            No jobs found for this search.
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                Showing {Math.min(visibleCount, jobs.length)} of {jobs.length} loaded jobs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.slice(0, visibleCount).map((job, idx) => (
                <Card
                  key={idx}
                  className="border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base leading-snug">
                        {job.title || "Untitled"}
                      </h3>
                      {job.company && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-400">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          {job.company}
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-500">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {job.location}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {job.job_type && (
                        <Badge variant="secondary" className="text-xs">
                          {job.job_type}
                        </Badge>
                      )}
                      {job.work_mode && job.work_mode !== "Onsite" && (
                        <Badge variant="secondary" className="text-xs">
                          {job.work_mode}
                        </Badge>
                      )}
                    </div>

                    {job.description && (
                      <DescriptionPreview text={job.description} />
                    )}

                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex gap-2">
                      {savedUrls.has(job.url) ? (
                        <Button variant="outline" size="sm" disabled className="flex-1 text-emerald-600 border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Saved
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                          onClick={() => saveJobMutation.mutate(job)}
                          disabled={saveJobMutation.isPending}
                        >
                          {saveJobMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Save
                        </Button>
                      )}
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Apply
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {(visibleCount < jobs.length || hasMore) && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-8"
                >
                  {isLoadingMore ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…</>
                  ) : (
                    `Load More Jobs`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
