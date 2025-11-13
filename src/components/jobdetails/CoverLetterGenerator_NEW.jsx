import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Copy, CheckCircle2, Loader2, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CoverLetterGenerator({ job }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState(job?.cover_letter || '');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateCoverLetter = async () => {
    // Check if user is on Pro plan
    const isPro = user?.subscription_tier === 'pro';
    if (!isPro) {
      navigate(createPageUrl("Pricing"));
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const result = await jobApi.generateCoverLetter(job.id);
      setCoverLetter(result.cover_letter);
      queryClient.invalidateQueries({ queryKey: ['job', job.id] });
    } catch (err) {
      setError(err.message || 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPro = user?.subscription_tier === 'pro';

  return (
    <Card className="border border-gray-100">
      <CardHeader>
        <CardTitle className="font-semibold flex items-center gap-2">
          AI Cover Letter Generator
          {!isPro && (
            <Crown className="w-5 h-5 text-yellow-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isPro && (
          <Alert className="border-indigo-200 bg-indigo-50">
            <Crown className="w-4 h-4 text-indigo-600" />
            <AlertDescription className="text-indigo-900">
              <strong>Pro Feature:</strong> Upgrade to Pro to generate AI-powered cover letters.
              <button 
                onClick={() => navigate(createPageUrl("Pricing"))}
                className="ml-2 underline hover:no-underline font-medium"
              >
                View Plans
              </button>
            </AlertDescription>
          </Alert>
        )}

        {!coverLetter ? (
          <div className="text-center py-8">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center ${
              isPro 
                ? 'bg-indigo-50' 
                : 'bg-gray-100'
            }`}>
              {isPro ? (
                <Sparkles className="w-8 h-8 text-indigo-600" />
              ) : (
                <Crown className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {isPro ? 'Generate Your Cover Letter' : 'Unlock AI Cover Letters'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {isPro 
                ? 'AI will create a personalized cover letter based on your profile and this job'
                : 'Upgrade to Pro to generate personalized cover letters with AI'
              }
            </p>
            <Button
              onClick={generateCoverLetter}
              disabled={generating || !isPro}
              className={isPro 
                ? "bg-indigo-600 hover:bg-indigo-700" 
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              }
            >
              {!isPro ? (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </>
              ) : generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={12}
              className="font-sans"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button
                onClick={generateCoverLetter}
                disabled={generating}
                variant="outline"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
