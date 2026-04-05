import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Bookmark, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "@/api/jobmate";

const COMPANY_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
];
function companyGradient(name = "") { return COMPANY_COLORS[name.charCodeAt(0) % COMPANY_COLORS.length]; }
function companyInitials(name = "") { return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"; }

function MatchPill({ score }) {
  const color =
    score >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    score >= 50 ? "text-amber-700  bg-amber-50  border-amber-200"  :
                  "text-gray-500   bg-gray-50   border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border tabular-nums ${color}`}>
      {score}%
    </span>
  );
}

export default function JobCard({ job, onView }) {
  const queryClient = useQueryClient();
  const gradient = companyGradient(job.company);
  const initials = companyInitials(job.company);
  const isApplied = job.status === 'applied';

  const isDbJob = typeof job.id === 'number';

  const markApplied = useMutation({
    mutationFn: () => jobApi.update(job.id, { status: 'applied' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return (
    <div
      onClick={onView}
      className="group relative bg-white border border-gray-100 rounded-xl p-5 cursor-pointer
                 transition-all duration-200 hover:border-gray-200 hover:shadow-md
                 flex flex-col gap-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug break-words">
              {job.title}
            </h3>
            {job.isSaved && <Bookmark className="w-3.5 h-3.5 fill-blue-500 text-blue-500 shrink-0 mt-0.5" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {job.company && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="w-3 h-3 shrink-0" />{job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3 shrink-0" />{job.location}
              </span>
            )}
          </div>
        </div>

        {job.matchScore > 0 && <MatchPill score={job.matchScore} />}
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed -mt-1">{job.description}</p>
      )}

      {/* Tags + action */}
      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-3 border-t border-gray-50">
        {job.tags?.slice(0, 3).map((tag, idx) => (
          <Badge key={idx} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-gray-100 text-gray-500 border-0 hover:bg-gray-100">
            {tag}
          </Badge>
        ))}
        {(job.tags?.length ?? 0) > 3 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-gray-100 text-gray-400 border-0">{`+${job.tags.length - 3}`}</Badge>
        )}
        {job.job_type && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-gray-200 text-gray-400">{job.job_type}</Badge>
        )}
        {isDbJob && (!isApplied ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px] border-blue-200 text-blue-600 hover:bg-blue-50 shrink-0"
            onClick={(e) => { e.stopPropagation(); markApplied.mutate(); }}
            disabled={markApplied.isPending}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Applied
          </Button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Applied
          </span>
        ))}
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto shrink-0"
          >
            <Button
              size="sm"
              className="h-6 px-2 text-[11px] bg-blue-600 hover:bg-blue-700 text-white -mr-1"
            >
              <ExternalLink className="w-3 h-3 mr-1" /> Apply
            </Button>
          </a>
        )}
        {!job.url && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mr-1 group-hover:translate-x-0.5 transition-transform"
          >
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
