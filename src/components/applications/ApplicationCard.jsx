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
  saved: { label: 'Saved', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  interview: { label: 'Interview', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  offer: { label: 'Offer', color: 'bg-green-100 text-green-700 border-green-300' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-300' },
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
    <Card className="border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 
                  className="text-lg font-semibold text-gray-900 hover:text-indigo-600 cursor-pointer"
                  onClick={() => navigate(createPageUrl("JobDetails") + `?id=${application.id}`)}
                >
                  {application.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
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
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
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