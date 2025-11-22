import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Link2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function AddJobDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [jobUrl, setJobUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    status: 'saved',
  });

  const createJobMutation = useMutation({
    mutationFn: (data) => jobApi.create(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      location: '',
      description: '',
      status: 'saved',
    });
    setError('');
    setJobUrl('');
    setActiveTab('manual');
  };

  const handleExtractFromUrl = async () => {
    if (!jobUrl) {
      setError('Please enter a job URL');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/api/jobs/scrape-url?url=${encodeURIComponent(jobUrl)}&user_id=${user.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to extract job details');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Populate form with extracted data
        setFormData({
          title: result.data.title || '',
          company: result.data.company || '',
          location: result.data.location || '',
          description: result.data.description || '',
          job_type: result.data.job_type || 'Full-time',
          work_mode: result.data.work_mode || 'Onsite',
          skills: result.data.skills || '',
          salary_min: result.data.salary_min || null,
          salary_max: result.data.salary_max || null,
          apply_url: result.data.apply_url || jobUrl,
          status: 'saved',
        });
        
        toast.success('Job details extracted successfully! Review and save.');
        setActiveTab('manual'); // Switch to manual tab to review
      }
    } catch (err) {
      setError(err.message || 'Failed to extract job details from URL');
      toast.error('Failed to extract job details');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.company || !formData.description) {
      setError('Please fill in title, company, and description');
      return;
    }

    createJobMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Add New Job
          </DialogTitle>
          <DialogDescription>
            Add a job manually or extract details from a URL
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Extract from URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Job URL *</Label>
              <Input
                id="jobUrl"
                placeholder="https://www.linkedin.com/jobs/view/..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                disabled={isExtracting}
              />
              <p className="text-sm text-gray-500">
                Supports: LinkedIn, Indeed, Glassdoor, Drushim, AllJobs
              </p>
            </div>

            <Button
              onClick={handleExtractFromUrl}
              disabled={isExtracting}
              className="w-full"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Job Details...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Job Details
                </>
              )}
            </Button>

            {formData.title && (
              <Alert>
                <AlertDescription>
                  ✅ Job extracted! Switch to Manual Entry tab to review and save.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
              id="title"
              placeholder="e.g. Senior Software Engineer"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              placeholder="e.g. Google"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              placeholder="e.g. San Francisco, CA or Remote"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description *</Label>
            <Textarea
              id="description"
              placeholder="Paste the full job description here..."
              rows={8}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createJobMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createJobMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Job
                </>
              )}
            </Button>
          </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
