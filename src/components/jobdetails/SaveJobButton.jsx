import React from 'react';
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function SaveJobButton({ job, existingApplication, matchScore }) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const saveJobMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Application.create({
        job_id: job.id,
        user_email: user.email,
        status: 'saved',
        match_score: matchScore,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const unsaveJobMutation = useMutation({
    mutationFn: () => base44.entities.Application.delete(existingApplication.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const handleToggleSave = () => {
    if (existingApplication) {
      unsaveJobMutation.mutate();
    } else {
      saveJobMutation.mutate();
    }
  };

  const isLoading = saveJobMutation.isPending || unsaveJobMutation.isPending;

  return (
    <Button
      variant={existingApplication ? "default" : "outline"}
      className={`w-full ${existingApplication ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
      onClick={handleToggleSave}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {existingApplication ? 'Removing...' : 'Saving...'}
        </>
      ) : (
        <>
          <Bookmark className={`w-4 h-4 mr-2 ${existingApplication ? 'fill-current' : ''}`} />
          {existingApplication ? 'Saved to Applications' : 'Save Job'}
        </>
      )}
    </Button>
  );
}