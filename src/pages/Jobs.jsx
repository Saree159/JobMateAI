import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Briefcase, Loader2, RefreshCw,
  Bookmark, CheckCircle2, ExternalLink, Building2, MapPin,
  Linkedin, Globe, Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import AddJobDialog from "../components/jobs/AddJobDialog";
import JobCard from "../components/jobs/JobCard";
import JobFilters from "../components/jobs/JobFilters";

const PAGE_SIZE = 10;

// ── Match score ring ────────────────────────────────────────────────────────
function MatchBadge({ score }) {
  const color =
    score >= 70 ? "text-emerald-600 border-emerald-200 bg-emerald-50" :
    score >= 40 ? "text-amber-600 border-amber-200 bg-amber-50" :
                  "text-gray-500 border-gray-200 bg-gray-50";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

// ── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (source === "linkedin")
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        <Linkedin className="w-3 h-3" /> LinkedIn
      </span>
    );
  if (source === "techmap")
    return (
      <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
        <Globe className="w-3 h-3" /> TechMap
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <Globe className="w-3 h-3" /> Drushim
    </span>
  );
}

// ── Discover job card ────────────────────────────────────────────────────────
function DiscoverCard({ job, onSave, saving, saved }) {
  const [expanded, setExpanded] = useState(false);
  const lines = (job.description || "").split("\n").filter(Boolean);
  const preview = lines.slice(0, 3).join("\n");

  return (
    <Card className="border border-gray-100 hover:border-gray-200 transition-colors flex flex-col">
      <CardContent className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {job.title || "Untitled"}
            </h3>
            {job.company && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Building2 className="w-3 h-3 shrink-0" /> {job.company}
              </div>
            )}
            {job.location && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <MapPin className="w-3 h-3 shrink-0" /> {job.location}
              </div>
            )}
          </div>
          <MatchBadge score={job.match_score || 0} />
        </div>

        {/* Source + type badges */}
        <div className="flex flex-wrap gap-1.5">
          <SourceBadge source={job.source} />
          {job.job_type && <Badge variant="secondary" className="text-xs">{job.job_type}</Badge>}
          {job.work_mode && job.work_mode !== "Onsite" && (
            <Badge variant="secondary" className="text-xs">{job.work_mode}</Badge>
          )}
        </div>

        {/* Description preview */}
        {job.description && (
          <div className="text-xs text-gray-400 leading-relaxed">
            <p className="whitespace-pre-line break-words">
              {expanded ? job.description : preview}
            </p>
            {lines.length > 3 && (
              <button
                className="text-blue-600 hover:text-blue-700 mt-1 font-medium"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {/* Skills */}
        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 5).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-1">
          {saved ? (
            <Button variant="outline" size="sm" disabled className="flex-1 text-emerald-600 border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Saved
            </Button>
          ) : (
            <Button
              variant="outline" size="sm"
              className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={() => onSave(job)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5 mr-1.5" />}
              Save
            </Button>
          )}
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Jobs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = useState("discover");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", job_type: "all", experience_level: "all", location: "" });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [savedUrls, setSavedUrls] = useState(new Set());

  // My tracked jobs
  const { data: myJobs = [], isLoading: myLoading } = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: () => (user?.id ? jobApi.listByUser(user.id) : []),
    enabled: !!user?.id,
  });

  // All sources ranked by match score
  const { data: discoverData, isLoading: discoverLoading, refetch: refetchDiscover, isFetching: discoverRefetching } = useQuery({
    queryKey: ["top-matches", user?.id],
    queryFn: () => jobApi.topMatches(user.id),
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });

  const saveJobMutation = useMutation({
    mutationFn: (job) => jobApi.create(user.id, {
      title: job.title,
      company: job.company || "Unknown",
      location: job.location || "",
      description: job.description || "",
      url: job.url || "",
      job_type: job.job_type || "",
      status: "saved",
      source: job.source || "other",
    }),
    onSuccess: (saved, job) => {
      setSavedUrls((prev) => new Set([...prev, job.url]));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(`"${saved.title}" saved to your applications`);
    },
    onError: () => toast.error("Failed to save job"),
  });

  // ── Filtered "My Jobs" ──────────────────────────────────────────────────
  const filteredMyJobs = myJobs
    .filter((job) => {
      const q = searchQuery.toLowerCase();
      return (
        (!q || job.title?.toLowerCase().includes(q) || job.company?.toLowerCase().includes(q)) &&
        (!filters.location || job.location?.toLowerCase().includes(filters.location.toLowerCase())) &&
        (filters.status === "all" || job.status === filters.status)
      );
    })
    .map((job) => ({
      ...job,
      matchScore: job.match_score ?? (() => {
        if (!user?.skills?.length) return 0;
        const skills = typeof user.skills === "string" ? user.skills.split(",").map((s) => s.trim()) : user.skills;
        const text = `${job.title} ${job.description}`.toLowerCase();
        return Math.min(100, Math.round((skills.filter((s) => text.includes(s.toLowerCase())).length / skills.length) * 100));
      })(),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  // ── Filtered "Discover" ─────────────────────────────────────────────────
  const allDiscoverJobs = discoverData?.jobs || [];
  const filteredDiscoverJobs = discoverSearch
    ? allDiscoverJobs.filter((j) => {
        const q = discoverSearch.toLowerCase();
        return j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q);
      })
    : allDiscoverJobs;

  const visibleJobs = filteredDiscoverJobs.slice(0, visibleCount);
  const hasMoreDiscover = visibleCount < filteredDiscoverJobs.length;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {t("jobs.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === "discover"
              ? `${filteredDiscoverJobs.length} jobs from LinkedIn · Drushim · TechMap, ranked by match`
              : `${filteredMyJobs.length} tracked applications`}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
          <Plus className="w-4 h-4 mr-2" /> {t("jobs.addJob")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("discover")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "discover" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Zap className="w-3.5 h-3.5 inline mr-1.5" />
          Discover
        </button>
        <button
          onClick={() => setTab("my")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "my" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 inline mr-1.5" />
          My Applications
        </button>
      </div>

      {/* ── DISCOVER TAB ── */}
      {tab === "discover" && (
        <>
          {/* Search + Refresh */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search jobs…"
                value={discoverSearch}
                onChange={(e) => { setDiscoverSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm"
              />
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => { refetchDiscover(); setVisibleCount(PAGE_SIZE); }}
              disabled={discoverRefetching}
              className="shrink-0"
            >
              {discoverRefetching
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>

          {discoverLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border border-gray-100">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 flex-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDiscoverJobs.length === 0 ? (
            <Card className="border border-gray-100">
              <CardContent className="text-center py-20">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">No jobs found</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {user?.target_role
                    ? "Try refreshing or updating your target role in Profile."
                    : "Set your target role in Profile to get personalized job matches."}
                </p>
                <Button variant="outline" onClick={() => navigate(createPageUrl("Profile"))}>
                  Go to Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleJobs.map((job, idx) => (
                  <DiscoverCard
                    key={`${job.source}-${job.url || idx}`}
                    job={job}
                    onSave={(j) => saveJobMutation.mutate(j)}
                    saving={saveJobMutation.isPending}
                    saved={savedUrls.has(job.url)}
                  />
                ))}
              </div>

              {hasMoreDiscover && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    className="px-8"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  >
                    Load More Jobs ({filteredDiscoverJobs.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── MY APPLICATIONS TAB ── */}
      {tab === "my" && (
        <>
          <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder={t("jobs.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm"
                />
              </div>
              <JobFilters filters={filters} setFilters={setFilters} />
            </div>
          </div>

          {myLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border border-gray-100">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMyJobs.length === 0 ? (
            <Card className="border border-gray-100">
              <CardContent className="text-center py-20">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-500 mb-2">{t("jobs.noJobsYet")}</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || filters.location ? t("jobs.adjustFilters") : t("jobs.startAdding")}
                </p>
                <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {t("jobs.addFirstJob")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyJobs.map((job) => (
                <JobCard key={job.id} job={job} onView={() => navigate(createPageUrl("JobDetails") + `?id=${job.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      <AddJobDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}
