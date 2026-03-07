import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, MapPin, Building2, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";


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

export default function TopMatchesList({ jobs, isLoading }) {
  const navigate = useNavigate();

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
              {jobs.length} jobs · Drushim.co.il
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No matches found yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add skills to your profile to see matching jobs from Israeli job boards
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl("Profile"))}>
              Complete Profile
            </Button>
          </div>
        ) : (
          jobs.map((job, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-4 border border-white/5 rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all bg-card cursor-pointer"
              onClick={() => navigate(createPageUrl("jobMatch"), { state: { job } })}
            >
              <MatchBadge score={job.match_score ?? 0} />

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{job.title}</h3>
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
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1.5">{job.description}</p>
                )}

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
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => navigate(createPageUrl("israeliJobs"))}
          >
            Browse All Israeli Jobs
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
