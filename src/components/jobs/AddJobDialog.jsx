
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Link as LinkIcon, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AddJobDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('manual');
  const [jobUrl, setJobUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary_range: '',
    description: '',
    requirements: '',
    apply_url: '',
    job_type: 'full-time',
    experience_level: '',
    tags: '',
    source: 'manual',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
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
      salary_range: '',
      description: '',
      requirements: '',
      apply_url: '',
      job_type: 'full-time',
      experience_level: '',
      tags: '',
      source: 'manual',
    });
    setJobUrl('');
    setError('');
  };

  const extractFromUrl = async () => {
    const isPro = user?.subscription_tier === 'pro';
    if (!isPro) {
      setError('URL extraction is a Pro feature. Please upgrade or enter job details manually.');
      return;
    }

    if (!jobUrl) {
      setError('Please enter a job URL');
      return;
    }

    setExtracting(true);
    setError('');

    try {
      const schema = await base44.entities.Job.schema();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract job details from this URL: ${jobUrl}. 
        Visit the page and extract: job title, company name, location, salary range (if mentioned), 
        full job description, requirements/qualifications, and relevant skill tags.`,
        add_context_from_internet: true,
        response_json_schema: schema,
      });

      setFormData({
        ...result,
        apply_url: jobUrl,
        source: jobUrl.includes('linkedin') ? 'linkedin' : 
                jobUrl.includes('drushim') ? 'drushim' : 
                jobUrl.includes('alljobs') ? 'alljobs' : 'other',
        tags: typeof result.tags === 'string' ? result.tags : result.tags?.join(', ') || '',
      });
      setMode('manual');
    } catch (err) {
      setError('Failed to extract job details. Please try manually entering the information.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.company || !formData.description) {
      setError('Please fill in title, company, and description');
      return;
    }

    const jobData = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
    };

    createJobMutation.mutate(jobData);
  };

  const isPro = user?.subscription_tier === 'pro';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Add New Job
          </DialogTitle>
          <DialogDescription>
            Add a job manually or extract details from a URL {!isPro && '(Pro feature)'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" disabled={!isPro}>
              Extract from URL {!isPro && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            {!isPro && (
              <Alert className="border-indigo-200 bg-indigo-50">
                <Crown className="w-4 h-4 text-indigo-600" />
                <AlertDescription className="text-indigo-900">
                  <strong>Pro Feature:</strong> Upgrade to Pro to extract job details from URLs automatically.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Job Listing URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://linkedin.com/jobs/..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="flex-1"
                  disabled={!isPro}
                />
                <Button
                  onClick={extractFromUrl}
                  disabled={extracting || !isPro}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {extracting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</>
                  ) : (
                    <><LinkIcon className="w-4 h-4 mr-2" /> Extract</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Supports LinkedIn, Drushim, AllJobs, and other job sites
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Senior Backend Developer"
                />
              </div>
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="TechCorp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Tel Aviv / Remote"
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Range</Label>
                <Input
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  placeholder="₪15,000 - ₪25,000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={formData.job_type} onValueChange={(value) => setFormData({ ...formData, job_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={formData.experience_level} onValueChange={(value) => setFormData({ ...formData, experience_level: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Full job description..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Job requirements and qualifications..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Skills/Tags (comma separated)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Python, React, AWS, Docker"
              />
            </div>

            <div className="space-y-2">
              <Label>Application URL</Label>
              <Input
                value={formData.apply_url}
                onChange={(e) => setFormData({ ...formData, apply_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createJobMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createJobMutation.isPending ? 'Adding...' : 'Add Job'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
