import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "@/api/jobmate";
import { 
  Building2, 
  MapPin, 
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Trash2
} from "lucide-react";
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

const statusConfig = {
  saved: { label: 'Saved', color: 'bg-white/10 text-gray-300 border-gray-300' },
  applied: { label: 'Applied', color: 'bg-blue-900/40 text-blue-300 border-blue-300' },
  interview: { label: 'Interview', color: 'bg-purple-100 text-purple-300 border-purple-300' },
  offer: { label: 'Offer', color: 'bg-green-900/40 text-green-700 border-green-300' },
  rejected: { label: 'Rejected', color: 'bg-red-900/40 text-red-700 border-red-300' },
};

export default function ApplicationCard({ application }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => jobApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: (id) => jobApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const status = statusConfig[application.status];

  return (
    <Card className="border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-semibold text-white hover:text-blue-600 cursor-pointer break-words"
                  onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}
                >
                  {application.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {application.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {application.location || 'Remote'}
                  </span>
                  {application.match_score && (
                    <Badge variant="outline" className="text-xs">
                      {application.match_score}% Match
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Badge className={`${status.color} border`}>
                {status.label}
              </Badge>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(application.created_date), 'MMM d, yyyy')}
              </span>
              {application.applied_date && (
                <span className="text-sm text-gray-500">
                  Applied: {format(new Date(application.applied_date), 'MMM d')}
                </span>
              )}
            </div>

            {application.notes && (
              <p className="text-sm text-gray-400 mt-3 line-clamp-2">
                {application.notes}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}>
                View Job Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'saved' })}>
                Mark as Saved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'applied' })}>
                Mark as Applied
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'interview' })}>
                Mark as Interview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'offer' })}>
                Mark as Offer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: application.id, status: 'rejected' })}>
                Mark as Rejected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => deleteApplicationMutation.mutate(application.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Application
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}