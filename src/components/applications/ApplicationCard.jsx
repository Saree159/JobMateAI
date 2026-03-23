import React from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "@/api/jobmate";
import { Building2, MapPin, Calendar, MoreHorizontal, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUS = {
  saved:     { label: 'Saved',     style: 'bg-gray-500/10   text-gray-400   border-gray-500/20'   },
  applied:   { label: 'Applied',   style: 'bg-blue-500/10   text-blue-400   border-blue-500/20'   },
  interview: { label: 'Interview', style: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  offer:     { label: 'Offer',     style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected:  { label: 'Rejected', style: 'bg-red-500/10    text-red-400    border-red-500/20'    },
};

// Deterministic gradient from company name
const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
];
function companyGradient(name = "") {
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}
function companyInitials(name = "") {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export default function ApplicationCard({ application }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => jobApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });

  const deleteApp = useMutation({
    mutationFn: (id) => jobApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });

  const status = STATUS[application.status] ?? STATUS.saved;
  const gradient = companyGradient(application.company || "");
  const initials = companyInitials(application.company || "");

  return (
    <div className="group bg-card border border-white/5 rounded-xl p-4 transition-all duration-200 hover:border-white/10 hover:bg-[hsl(221_40%_11%)]">
      <div className="flex items-start gap-3">
        {/* Company avatar */}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md`}>
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}
                className="text-sm font-semibold text-white hover:text-blue-300 transition-colors text-left leading-snug break-words"
              >
                {application.title}
              </button>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                {application.company && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 className="w-3 h-3 shrink-0" />
                    {application.company}
                  </span>
                )}
                {application.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {application.location}
                  </span>
                )}
              </div>
            </div>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-gray-600 hover:text-gray-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(STATUS).map(([key, val]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => updateStatus.mutate({ id: application.id, status: key })}
                    className={application.status === key ? 'opacity-50 pointer-events-none' : ''}
                  >
                    Mark as {val.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deleteApp.mutate(application.id)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Footer row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.style}`}>
              {status.label}
            </span>

            {application.match_score > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-blue-500/20 bg-blue-500/10 text-blue-400">
                {application.match_score}% match
              </span>
            )}

            <span className="flex items-center gap-1 text-[11px] text-gray-600 ml-auto">
              <Calendar className="w-3 h-3" />
              {format(new Date(application.created_date), 'MMM d, yyyy')}
            </span>
          </div>

          {application.notes && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              {application.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
