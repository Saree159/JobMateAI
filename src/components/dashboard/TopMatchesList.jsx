import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Sparkles, MapPin, Building2, ExternalLink,
  Linkedin, Globe, Search, X, Briefcase, Clock,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SOURCE_FILTERS = ["All", "LinkedIn", "Drushim"];
const SCORE_FILTERS  = [
  { label: "All",  min: 0  },
  { label: "≥70%", min: 70 },
  { label: "≥40%", min: 40 },
];

// Inline score pill — replaces the bulky 64×64 badge
function ScorePill({ score }) {
  const style =
    score >= 70 ? "text-green-400  bg-green-500/10  border-green-500/20"  :
    score >= 40 ? "text-amber-400  bg-amber-500/10  border-amber-500/20"  :
                  "text-gray-500   bg-white/5        border-white/10";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums shrink-0 ${style}`}>
      {score}%
    </span>
  );
}

function extractRequiredYears(description) {
  if (!description) return null;
  const m =
    description.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*years?\s+(?:of\s+)?(?:experience|exp)/i) ||
    description.match(/experience[:\s]+(\d+)\+?\s*years?/i)                                 ||
    description.match(/minimum\s+(\d+)\s*years?/i);
  return m ? parseInt(m[1]) : null;
}

// Chip button used in filter bar
function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function TopMatchesList({ jobs, isLoading }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch]     = useState("");
  const [source, setSource]     = useState("All");
  const [scoreFilter, setScore] = useState("All");

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
  const clearFilters    = () => { setSearch(""); setSource("All"); setScore("All"); };

  if (isLoading) {
    return (
      <Card className="border border-white/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Top Matches for You
          </CardTitle>
          {jobs.length > 0 && (
            <span className="text-xs text-gray-500 tabular-nums">
              {filtered.length} / {jobs.length}
            </span>
          )}
        </div>

        {/* Filter bar — only shown when there are jobs */}
        {jobs.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <Input
                placeholder="Search title or company…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white/5 border-white/10 focus:border-blue-500/50 placeholder:text-gray-600"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Source + score chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {SOURCE_FILTERS.map(s => (
                <FilterChip key={s} active={source === s} onClick={() => setSource(s)}>
                  {s}
                </FilterChip>
              ))}
              <div className="w-px h-4 bg-white/10 mx-0.5" />
              {SCORE_FILTERS.map(f => (
                <FilterChip key={f.label} active={scoreFilter === f.label} onClick={() => setScore(f.label)}>
                  {f.label}
                </FilterChip>
              ))}
              {hasActiveFilter && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Empty states */}
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-300 mb-1">No matches yet</p>
            <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">
              Add skills to your profile and we'll surface matching jobs from Drushim and LinkedIn.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-5 text-xs"
              onClick={() => navigate(createPageUrl("Profile"))}
            >
              Complete profile
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <Search className="w-7 h-7 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No jobs match your filters</p>
            <button
              onClick={clearFilters}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((job, idx) => {
            const reqYears  = extractRequiredYears(job.description);
            const userYears = user?.years_of_experience;
            const meetsExp  = reqYears != null && userYears != null ? userYears >= reqYears : null;

            return (
              <div
                key={idx}
                className="p-4 border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/[0.02] transition-all cursor-pointer group"
                onClick={() => navigate(createPageUrl("jobMatch"), { state: { job } })}
              >
                {/* Row 1: title + score + source */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{job.title}</h3>
                    <ScorePill score={job.match_score ?? 0} />
                  </div>

                  {/* Source tag */}
                  {job.source === "linkedin" ? (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Linkedin className="w-3 h-3" />
                      <span className="hidden sm:inline">LinkedIn</span>
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Globe className="w-3 h-3" />
                      <span className="hidden sm:inline">Drushim</span>
                    </span>
                  )}
                </div>

                {/* Row 2: company + location */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                  {job.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {job.company}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {job.location}
                    </span>
                  )}
                  {reqYears && (
                    <span className={`flex items-center gap-1 ${
                      meetsExp === true  ? 'text-green-400' :
                      meetsExp === false ? 'text-amber-400' : ''
                    }`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      {reqYears}+ yrs
                      {meetsExp === true  && <span className="text-green-400">✓</span>}
                      {meetsExp === false && <span>(you: {userYears})</span>}
                    </span>
                  )}
                </div>

                {/* Row 3: description snippet */}
                {job.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {job.description.split("\n").filter(Boolean).slice(0, 2).join(" ")}
                  </p>
                )}

                {/* Row 4: skill tags + apply button */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {job.skills?.slice(0, 4).map((s, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 font-normal"
                    >
                      {s}
                    </Badge>
                  ))}
                  {(job.skills?.length ?? 0) > 4 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-gray-500">
                      +{job.skills.length - 4}
                    </Badge>
                  )}
                  {job.experience_level && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                      {job.experience_level}
                    </Badge>
                  )}
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        Apply <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Footer nav */}
        {jobs.length > 0 && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-gray-500 hover:text-gray-200 hover:bg-white/5"
              onClick={() => navigate(createPageUrl("israeliJobs"))}
            >
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Israeli Jobs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-gray-500 hover:text-gray-200 hover:bg-white/5"
              onClick={() => navigate(createPageUrl("linkedinJobs"))}
            >
              <Linkedin className="w-3.5 h-3.5 mr-1.5" />
              LinkedIn Jobs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
