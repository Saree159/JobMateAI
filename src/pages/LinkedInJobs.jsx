import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Search, Linkedin, AlertCircle, MapPin, Building2, ExternalLink, Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function DescriptionPreview({ text }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n").filter(Boolean);
  const preview = lines.slice(0, 4).join("\n");
  const hasMore = lines.length > 4;
  return (
    <div className="text-xs text-gray-400 leading-relaxed">
      <p className="whitespace-pre-line">{expanded ? text : preview}</p>
      {hasMore && (
        <button
          className="text-blue-400 hover:text-blue-300 mt-1 font-medium"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function LinkedInJobs() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [role, setRole] = useState(user?.target_role || "");
  const [location, setLocation] = useState(user?.location_preference || "");
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [cached, setCached] = useState(false);

  const handleSearch = async () => {
    if (!role.trim()) {
      setError("Please enter a job role to search.");
      return;
    }
    setError("");
    setIsLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ role: role.trim() });
      if (location.trim()) params.set("location", location.trim());
      if (user?.id) params.set("user_id", user.id);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/jobs/scrape/linkedin?${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to fetch jobs");
      }
      const data = await response.json();
      setJobs(data.jobs || []);
      setCached(data.cached || false);
    } catch (err) {
      setError(err.message);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Linkedin className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">LinkedIn Jobs</h1>
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
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-400">Searching LinkedIn… this may take a moment</span>
          </div>
        )}

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
                {jobs.length} jobs found
                {cached && <span className="ml-2 text-xs text-gray-500">(cached)</span>}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job, idx) => (
                <Card
                  key={idx}
                  className="border border-white/5 hover:border-white/10 transition-colors"
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold text-white text-base leading-snug">
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
                            className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          View on LinkedIn
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
