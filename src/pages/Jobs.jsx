import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Briefcase, Loader2, RefreshCw,
  Bookmark, CheckCircle2, ExternalLink, Building2, MapPin,
  Linkedin, Globe, Zap, ChevronDown, Trash2,
} from "lucide-react";
import ScraperLoader from "@/components/jobs/ScraperLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import AddJobDialog from "../components/jobs/AddJobDialog";
import JobFilters from "../components/jobs/JobFilters";

const PAGE_SIZE = 20;

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
function DiscoverCard({ job, onSelect, onSave, saving, saved }) {
  return (
    <Card
      className="border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex flex-col cursor-pointer"
      onClick={() => onSelect(job)}
    >
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
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-line break-words">
            {job.description}
          </p>
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
        <div className="mt-auto flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
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
          <Button
            variant="outline" size="sm"
            className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => onSelect(job)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const JOB_STATUSES = [
  { value: "interesting", label: "Interesting",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "saved",       label: "Saved",        color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "applied",     label: "Applied",      color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "interview",   label: "Interview",    color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "offer",       label: "Offer",        color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "rejected",    label: "Rejected",     color: "bg-red-100 text-red-600 border-red-200" },
];

function StatusPill({ status, jobId, onChanged }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const cfg = JOB_STATUSES.find((s) => s.value === status) || JOB_STATUSES[0];

  const handleSelect = async (val) => {
    setOpen(false);
    if (val === status) return;
    setSaving(true);
    try {
      await jobApi.update(jobId, { status: val });
      onChanged(jobId, val);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-opacity ${cfg.color} ${saving ? "opacity-50" : "hover:opacity-80"}`}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : cfg.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px]">
          {JOB_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleSelect(s.value)}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors ${s.value === status ? "opacity-50 cursor-default" : ""}`}
            >
              <span className={`inline-block px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Saved job list row ────────────────────────────────────────────────────────
function SavedJobRow({ job, onStatusChange, onOpen, onDelete }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
      onClick={() => onOpen(job)}
    >
      {/* Match score */}
      <div className="shrink-0 w-10 text-center">
        <MatchBadge score={job.matchScore || 0} />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{job.title || "Untitled"}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
          {job.company && <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{job.company}</span>}
          {job.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>}
        </div>
      </div>

      {/* Source */}
      <div className="hidden sm:block shrink-0">
        <SourceBadge source={job.source} />
      </div>

      {/* Status pill */}
      <div className="shrink-0">
        <StatusPill status={job.status} jobId={job.id} onChanged={onStatusChange} />
      </div>

      {/* Open button */}
      <button
        className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        onClick={(e) => { e.stopPropagation(); onOpen(job); }}
        title="Open job details"
      >
        <ExternalLink className="w-4 h-4" />
      </button>

      {/* Delete button */}
      <button
        className="shrink-0 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
        title="Remove saved job"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
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
  // optimistic status overrides: {jobId: newStatus}
  const [statusOverrides, setStatusOverrides] = useState({});

  // My tracked jobs
  const { data: myJobs = [], isLoading: myLoading } = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: () => (user?.id ? jobApi.listByUser(user.id) : []),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // All sources ranked by match score
  const { data: discoverData, isLoading: discoverLoading, refetch: refetchDiscover, isFetching: discoverRefetching } = useQuery({
    queryKey: ["top-matches", user?.id],
    queryFn: () => jobApi.topMatches(user.id),
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
    onSuccess: (data) => {
      // Auto force-refresh if cached result has suspiciously few jobs
      if (data?.cached && (data?.total_scraped ?? 0) < 5) {
        jobApi.topMatches(user.id, true).then(() =>
          refetchDiscover()
        ).catch(() => {});
      }
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId) => jobApi.delete(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ["jobs", user?.id] });
      const previous = queryClient.getQueryData(["jobs", user?.id]);
      queryClient.setQueryData(["jobs", user?.id], (old = []) => old.filter(j => j.id !== jobId));
      toast.success("Job removed.");
      return { previous };
    },
    onError: (_err, _jobId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["jobs", user?.id], ctx.previous);
      toast.error("Failed to remove job.");
    },
  });

  const saveJobMutation = useMutation({ // v2
    mutationFn: (job) => jobApi.create(user.id, {
      title: job.title,
      company: job.company || "Unknown",
      location: job.location || "",
      description: job.description || job.title,
      apply_url: job.url || job.apply_url || "",
      ingest_job_id: job.ingest_job_id ?? null,
    }),
    onMutate: async (job) => {
      // Optimistic: mark as saved instantly
      setSavedUrls((prev) => new Set([...prev, job.url]));
      toast.success(`"${job.title}" added to Saved Jobs`);
    },
    onSuccess: (saved) => {
      // Update the cache with the real saved job from server
      queryClient.setQueryData(["jobs", user?.id], (old = []) => {
        const exists = old.some(j => j.id === saved.id);
        return exists ? old : [saved, ...old];
      });
    },
    onError: (_err, job) => {
      setSavedUrls((prev) => { const s = new Set(prev); s.delete(job.url); return s; });
      toast.error("Failed to save job");
    },
  });

  const handleSelectJob = (job) => {
    navigate(createPageUrl("JobDetails"), { state: { feedJob: job } });
  };

  // ── Filtered "My Jobs" ──────────────────────────────────────────────────
  const filteredMyJobs = myJobs
    .filter((job) => {
      const effectiveStatus = statusOverrides[job.id] ?? job.status;
      const q = searchQuery.toLowerCase();
      return (
        (!q || job.title?.toLowerCase().includes(q) || job.company?.toLowerCase().includes(q)) &&
        (!filters.location || job.location?.toLowerCase().includes(filters.location.toLowerCase())) &&
        (filters.status === "all" || effectiveStatus === filters.status)
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
              : `${filteredMyJobs.length} saved jobs`}
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
          <Bookmark className="w-3.5 h-3.5 inline mr-1.5" />
          Saved Jobs
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
              disabled={discoverRefetching || discoverLoading}
              className="shrink-0"
              title={discoverData?.rate_limited ? "Daily limit reached — upgrade for unlimited refreshes" : "Refresh jobs"}
            >
              {discoverRefetching || discoverLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className={`w-4 h-4 ${discoverData?.rate_limited ? "text-amber-400" : ""}`} />}
            </Button>
          </div>

          {discoverLoading || discoverRefetching ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden">
              <ScraperLoader />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6 pb-6 opacity-30 pointer-events-none select-none">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-36 rounded-xl bg-white border border-gray-200 animate-pulse" />
                ))}
              </div>
            </div>
          ) : discoverData?.rate_limited ? (
            <>
              {/* Rate-limit banner */}
              <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <Zap className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Daily refresh limit reached</p>
                  <p className="text-xs text-amber-600 mt-0.5">{discoverData.rate_limit_message} Showing your last cached results.</p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs"
                  onClick={() => navigate(createPageUrl("Pricing"))}
                >
                  Upgrade
                </Button>
              </div>
              {/* Still show cached jobs if any from previous load */}
              {filteredDiscoverJobs.length === 0 ? (
                <Card className="border border-gray-100">
                  <CardContent className="text-center py-16">
                    <p className="text-gray-400 text-sm">No cached jobs available. Come back tomorrow for fresh results.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleJobs.map((job, idx) => (
                    <DiscoverCard
                      key={`${job.source}-${job.url || idx}`}
                      job={job}
                      onSelect={handleSelectJob}
                      onSave={(j) => saveJobMutation.mutate(j)}
                      saving={saveJobMutation.isPending}
                      saved={savedUrls.has(job.url)}
                    />
                  ))}
                </div>
              )}
            </>
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
              {/* Source breakdown */}
              {discoverData?.source_counts && (
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">
                    {discoverData.total_scraped} jobs fetched
                    {discoverData.cached ? " (cached)" : " (fresh)"}
                  </span>
                  {Object.entries(discoverData.source_counts)
                    .filter(([, n]) => n > 0)
                    .map(([src, n]) => (
                      <span key={src} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {src} · {n}
                      </span>
                    ))}
                  {discoverData.total_scraped < 10 && (
                    <button
                      className="text-blue-500 underline"
                      onClick={() => {
                        jobApi.topMatches(user.id, true).then(() => refetchDiscover());
                      }}
                    >
                      Low results — force refresh
                    </button>
                  )}
                </div>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleJobs.map((job, idx) => (
                  <DiscoverCard
                    key={`${job.source}-${job.url || idx}`}
                    job={job}
                    onSelect={handleSelectJob}
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

      {/* ── SAVED JOBS TAB ── */}
      {tab === "my" && (
        <>
          {/* Search + status filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search saved jobs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm"
              />
            </div>
            {/* Status filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {[{ value: "all", label: "All" }, ...JOB_STATUSES].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setFilters((f) => ({ ...f, status: s.value }))}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    filters.status === s.value
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {myLoading ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <Skeleton className="h-6 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredMyJobs.length === 0 ? (
            <Card className="border border-gray-100">
              <CardContent className="text-center py-20">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-500 mb-2">No saved jobs yet</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || filters.status !== "all" ? "Try adjusting filters." : "Save interesting jobs from Discover to find them here."}
                </p>
                <Button variant="outline" onClick={() => setTab("discover")}>
                  <Zap className="w-4 h-4 mr-2" /> Browse Jobs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              {/* Table header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <div className="w-10 text-center">Match</div>
                <div className="flex-1">Job</div>
                <div className="hidden sm:block w-24">Source</div>
                <div className="w-28">Status</div>
                <div className="w-8" />
                <div className="w-8" />
              </div>
              {filteredMyJobs.map((job) => (
                <SavedJobRow
                  key={job.id}
                  job={{ ...job, status: statusOverrides[job.id] ?? job.status }}
                  onStatusChange={(id, val) => setStatusOverrides((o) => ({ ...o, [id]: val }))}
                  onOpen={() => navigate(createPageUrl("JobDetails") + `?id=${job.id}`)}
                  onDelete={(id) => deleteJobMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddJobDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}
