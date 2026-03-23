import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Bookmark, ArrowRight } from "lucide-react";

// Deterministic color from company name
const COMPANY_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
];
function companyGradient(name = "") {
  const idx = name.charCodeAt(0) % COMPANY_COLORS.length;
  return COMPANY_COLORS[idx];
}
function companyInitials(name = "") {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function MatchPill({ score }) {
  const color =
    score >= 70 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    score >= 50 ? "text-amber-400  bg-amber-500/10  border-amber-500/20"  :
                  "text-gray-500   bg-white/5        border-white/10";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${color}`}>
      {score}%
    </span>
  );
}

export default function JobCard({ job, onView }) {
  const gradient = companyGradient(job.company);
  const initials = companyInitials(job.company);

  return (
    <div
      onClick={onView}
      className="group relative bg-card border border-white/5 rounded-xl p-5 cursor-pointer
                 transition-all duration-200 hover:border-white/10 hover:bg-[hsl(221_40%_11%)]
                 hover:shadow-xl hover:shadow-black/20 flex flex-col gap-4"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Company logo placeholder */}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md`}>
          <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug break-words">
              {job.title}
            </h3>
            {job.isSaved && (
              <Bookmark className="w-3.5 h-3.5 fill-blue-500 text-blue-500 shrink-0 mt-0.5" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {job.company && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="w-3 h-3 shrink-0" />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3 shrink-0" />
                {job.location}
              </span>
            )}
          </div>
        </div>

        {/* Match score */}
        {job.matchScore > 0 && <MatchPill score={job.matchScore} />}
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed -mt-1">
          {job.description}
        </p>
      )}

      {/* Tags + action */}
      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-3 border-t border-white/[0.05]">
        {job.tags?.slice(0, 3).map((tag, idx) => (
          <Badge key={idx} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-white/[0.05] text-gray-400 border-0">
            {tag}
          </Badge>
        ))}
        {(job.tags?.length ?? 0) > 3 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-white/[0.05] text-gray-600 border-0">
            +{job.tags.length - 3}
          </Badge>
        )}
        {job.job_type && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-white/10 text-gray-500">
            {job.job_type}
          </Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-2 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 -mr-1 group-hover:translate-x-0.5 transition-transform"
        >
          View
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
