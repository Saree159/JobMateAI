import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sparkles, MapPin, Building2, ExternalLink, Linkedin, Globe, Search, X, Briefcase, Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SOURCE_FILTERS = ["All", "LinkedIn", "Drushim"];
const SCORE_FILTERS  = [
  { label: "All",    min: 0  },
  { label: "High",   min: 70 },
  { label: "Good",   min: 40 },
];

function MatchBadge({ score }) {
  const color =
    score >= 70 ? "text-green-400 bg-green-900/30 border-green-500/30" :
    score >= 40 ? "text-yellow-400 bg-yellow-900/30 border-yellow-500/30" :
    "text-gray-400 bg-white/5 border-white/10";
  return (
    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 shrink-0 ${color}`}>
      <span className="text-lg font-bold leading-none">{score}%</span>
      <span className="text-[10px] mt-0.5 font-medium">match</span>
    </div>
  );
}

function extractRequiredYears(description) {
  if (!description) return null;
  const m = description.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*years?\s+(?:of\s+)?(?:experience|exp)/i)
    || description.match(/experience[:\s]+(\d+)\+?\s*years?/i)
    || description.match(/minimum\s+(\d+)\s*years?/i);
  return m ? parseInt(m[1]) : null;
}

export default function TopMatchesList({ jobs, isLoading }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch]       = useState("");
  const [source, setSource]       = useState("All");
  const [scoreFilter, setScore]   = useState("All");

  const filtered = useMemo(() => {
    const minScore = SCORE_FILTERS.find(f => f.label === scoreFilter)?.min ?? 0;
    const q = search.trim().toLowerCase();
    return jobs.filter(j => {
      if (source !== "All" && j.source?.toLowerCase() !== source.toLowerCase()) return false;
      if (j.match_score < minScore) return false;
      if (q && !`${j.title} ${j.company}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, search, source, scoreFilter]);

  const hasActiveFilter = search || source !== "All" || scoreFilter !== "All";
  const clearFilters = () => { setSearch(""); setSource("All"); setScore("All"); };

  if (isLoading) {
    return (
      <Card className="border border-white/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-56" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Top Matches for You
          {jobs.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              {filtered.length}/{jobs.length} jobs
            </Badge>
          )}
        </CardTitle>

        {/* Filter bar */}
        {jobs.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <Input
                placeholder="Search title or company…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white/5 border-white/10 focus:border-blue-500/50"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Source + Score chips */}
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                {SOURCE_FILTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      source === s
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {SCORE_FILTERS.map(f => (
                  <button
                    key={f.label}
                    onClick={() => setScore(f.label)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      scoreFilter === f.label
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {f.label === "All" ? "Any score" : f.label === "High" ? "High ≥70%" : "Good ≥40%"}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilter && (
              <button onClick={clearFilters} className="text-xs text-blue-400 hover:text-blue-300 self-start">
                Clear filters
              </button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No matches found yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add skills to your profile to see matching jobs from Drushim and LinkedIn
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl("Profile"))}>
              Complete Profile
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No jobs match your filters</p>
            <button onClick={clearFilters} className="text-xs text-blue-400 hover:text-blue-300 mt-2">
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((job, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-4 border border-white/5 rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all bg-card cursor-pointer"
              onClick={() => navigate(createPageUrl("jobMatch"), { state: { job } })}
            >
              <MatchBadge score={job.match_score ?? 0} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white truncate">{job.title}</h3>
                  {job.source === "linkedin" ? (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                      <Globe className="w-3 h-3" /> Drushim
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500 mt-0.5">
                  {job.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />{job.company}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{job.location}
                    </span>
                  )}
                </div>

                {job.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1.5 whitespace-pre-line">
                    {job.description.split("\n").filter(Boolean).slice(0, 2).join(" ")}
                  </p>
                )}

                {/* Experience & role details */}
                {(() => {
                  const reqYears = extractRequiredYears(job.description);
                  const userYears = user?.years_of_experience;
                  const userRole = user?.target_role;
                  if (!reqYears && !userRole) return null;
                  return (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {userRole && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />{userRole}
                        </span>
                      )}
                      {reqYears && (
                        <span className={`flex items-center gap-1 ${
                          userYears != null
                            ? userYears >= reqYears ? 'text-green-400' : 'text-amber-400'
                            : ''
                        }`}>
                          <Clock className="w-3 h-3" />
                          {reqYears}+ yrs required
                          {userYears != null && (
                            <span>{userYears >= reqYears ? '✓' : `(you: ${userYears})`}</span>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {job.skills?.slice(0, 4).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                  {(job.skills?.length ?? 0) > 4 && (
                    <Badge variant="secondary" className="text-xs">+{job.skills.length - 4}</Badge>
                  )}
                  {job.experience_level && (
                    <Badge variant="outline" className="text-xs">{job.experience_level}</Badge>
                  )}
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                      onClick={e => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2">
                        Apply <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {jobs.length > 0 && (
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(createPageUrl("israeliJobs"))}
            >
              <Globe className="w-4 h-4 mr-1.5" />
              Israeli Jobs
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(createPageUrl("linkedinJobs"))}
            >
              <Linkedin className="w-4 h-4 mr-1.5" />
              LinkedIn Jobs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
