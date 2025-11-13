import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Loader2,
  StickyNote,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import CoverLetterGenerator from "../components/jobdetails/CoverLetterGenerator";
import SaveJobButton from "../components/jobdetails/SaveJobButton";
import { toast } from 'sonner';

export default function JobDetails() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  const [notes, setNotes] = React.useState('');
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      return await jobApi.getById(parseInt(jobId));
    },
    enabled: !!jobId,
  });

  // Initialize notes when job loads
  React.useEffect(() => {
    if (job?.notes) {
      setNotes(job.notes);
    }
  }, [job]);

  const updateNotesMutation = useMutation({
    mutationFn: (noteText) => jobApi.update(parseInt(jobId), { notes: noteText }),
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(['job', jobId], updatedJob);
      setIsEditingNotes(false);
      toast.success('Notes saved successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save notes');
    }
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const calculateMatchScore = () => {
    if (!job) return 0;
    // Use server-calculated match score if available
    if (job.match_score) return job.match_score;
    
    // Fallback client-side calculation
    if (!user?.skills) return 0;
    const skills = typeof user.skills === 'string' ? user.skills.split(',').map(s => s.trim()) : user.skills;
    if (!skills.length) return 0;
    
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matches = skills.filter(skill => 
      jobText.includes(skill.toLowerCase())
    );
    
    return Math.min(100, Math.round((matches.length / skills.length) * 100));
  };

  const matchScore = calculateMatchScore();

  if (jobLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>Job not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Jobs"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Jobs
      </Button>

      {/* Job Header */}
      <Card className="border border-gray-100 mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Score */}
            <div className="text-center bg-gray-50 p-6 rounded-lg">
              <div className={`text-4xl font-semibold mb-1 ${
                matchScore >= 70 ? 'text-green-600' : 
                matchScore >= 50 ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {matchScore}%
              </div>
              <p className="text-sm text-gray-500">
                Match Score
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="font-semibold">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>

          {/* Cover Letter Generator */}
          <CoverLetterGenerator 
            job={job}
          />

          {/* Interview Notes */}
          <Card className="border border-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-indigo-600" />
                  Notes & Reminders
                </CardTitle>
                {!isEditingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add interview notes, follow-up reminders, or any other information about this job..."
                    className="min-h-[120px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveNotes}
                      disabled={updateNotesMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateNotesMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNotes(job?.notes || '');
                        setIsEditingNotes(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {notes ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
                  ) : (
                    <p className="text-gray-400 italic text-sm">No notes yet. Click Edit to add notes.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save Button */}
          <SaveJobButton 
            job={job}
            isSaved={job.status === 'saved'}
          />

          {/* Application Status */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="font-semibold text-sm">Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium capitalize">{job.status || 'saved'}</p>
                </div>
                {job.created_at && (
                  <div>
                    <p className="text-sm text-gray-600">Added</p>
                    <p className="font-medium">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="font-semibold text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  // Navigate to applications page or update status
                  navigate(createPageUrl("Applications"));
                }}
              >
                View All Applications
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
