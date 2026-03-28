import React from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "@/api/jobmate";
import { Building2, MapPin, Calendar, MoreHorizontal, ExternalLink, Trash2, Phone, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUS = {
  saved:     { label: 'Saved',     style: 'bg-gray-100    text-gray-600    border-gray-200'    },
  applied:   { label: 'Applied',   style: 'bg-blue-50     text-blue-700    border-blue-200'    },
  interview: { label: 'Interview', style: 'bg-violet-50   text-violet-700  border-violet-200'  },
  offer:     { label: 'Offer',     style: 'bg-emerald-50  text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rejected',  style: 'bg-red-50      text-red-700     border-red-200'     },
};

const GRADIENTS = [
  "from-blue-500 to-indigo-600", "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600", "from-orange-500 to-amber-600", "from-pink-500 to-rose-600",
];
function companyGradient(name = "") { return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length]; }
function companyInitials(name = "") { return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"; }

export default function ApplicationCard({ application }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => {
      if (!id) throw new Error('Missing job id');
      return jobApi.update(id, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
  const deleteApp = useMutation({
    mutationFn: (id) => {
      if (!id) throw new Error('Missing job id');
      return jobApi.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const status   = STATUS[application.status] ?? STATUS.saved;
  const gradient = companyGradient(application.company || "");
  const initials = companyInitials(application.company || "");

  return (
    <div className="group bg-white border border-gray-100 rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}
                className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left leading-snug break-words"
              >
                {application.title}
              </button>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                {application.company && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 className="w-3 h-3 shrink-0" />{application.company}
                  </span>
                )}
                {application.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3 h-3 shrink-0" />{application.location}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(STATUS).map(([key, val]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => updateStatus.mutate({ id: application.id, status: key })}
                    className={application.status === key ? 'opacity-40 pointer-events-none' : ''}
                  >
                    Mark as {val.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => deleteApp.mutate(application.id)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.style}`}>
              {status.label}
            </span>
            {application.match_score > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-blue-200 bg-blue-50 text-blue-700">
                {application.match_score}% match
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
              <Calendar className="w-3 h-3" />
              {application.created_at ? format(new Date(application.created_at), 'MMM d, yyyy') : '—'}
            </span>
          </div>

          {application.opening_sentence && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
              <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-indigo-700 space-y-0.5">
                {application.opening_sentence.split('\n').map((line, i) => (
                  <p key={i} dir={line.startsWith('HE:') ? 'rtl' : 'ltr'}>
                    {line.replace(/^(EN|HE):\s*/, '')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {application.notes && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{application.notes}</p>
          )}

          {application.status === 'applied' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-blue-700">
                <span className="font-semibold">Keep your phone nearby</span> — recruiters typically call within 3–7 business days.
                <span className="mx-1 text-blue-400">·</span>
                <span dir="rtl" className="font-medium">שמור על הטלפון קרוב — מגייסים בדרך כלל מתקשרים תוך 3–7 ימי עסקים</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
