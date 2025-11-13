import React from 'react';
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function SaveJobButton({ job, isSaved }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const saveJobMutation = useMutation({
    mutationFn: async () => {
      // In the standalone version, a job is created directly by the user and they own it
      // "Saving" just means updating its status to 'saved' if it's not already
      return await jobApi.update(job.id, { status: 'saved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', job.id] });
    },
  });

  const unsaveJobMutation = useMutation({
    mutationFn: () => jobApi.delete(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleToggleSave = () => {
    if (isSaved) {
      unsaveJobMutation.mutate();
    } else {
      saveJobMutation.mutate();
    }
  };

  const isLoading = saveJobMutation.isPending || unsaveJobMutation.isPending;

  return (
    <Button
      variant={isSaved ? "default" : "outline"}
      className={`w-full ${isSaved ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
      onClick={handleToggleSave}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isSaved ? 'Removing...' : 'Saving...'}
        </>
      ) : (
        <>
          <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved to Applications' : 'Save Job'}
        </>
      )}
    </Button>
  );
}
