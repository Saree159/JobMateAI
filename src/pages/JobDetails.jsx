import React from "react";
import { formatDateIL } from '@/utils/dateIL';
import { useAuth } from "@/lib/AuthContext";
import { jobApi, resumeApi } from "@/api/jobmate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Loader2,
  StickyNote,
  Save,
  HelpCircle,
  Lightbulb,
  DollarSign,
  TrendingUp,
  ScanSearch,
  Calendar,
  Bookmark,
  FileDown,
  Upload,
  Sparkles,
} from "lucide-react";
import WaitlistDialog from "@/components/ui/WaitlistDialog";
import { usageApi } from "@/api/jobmate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CoverLetterGenerator from "../components/jobdetails/CoverLetterGenerator";
import SaveJobButton from "../components/jobdetails/SaveJobButton";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

const JD = {
  en: {
    backToJobs:           'Back to Jobs',
    match:                'Match',
    yourRole:             'Your Role',
    yourExperience:       'Your Experience',
    required:             'Required',
    yrs:                  'yrs',
    jobDescription:       'Job Description',
    aiCoverLetter:        'AI Cover Letter Generator',
    saveJobFirstDesc:     'Save this job to generate a personalized cover letter.',
    saveJobFirst:         'Save Job First',
    saving:               'Saving…',
    resumeGapAnalysis:    'Resume Gap Analysis',
    analyzing:            'Analyzing…',
    reanalyze:            '🔄 Re-analyze',
    analyzeGaps:          'Analyze Gaps',
    useSavedResume:       '📄 Use Saved Resume',
    uploadNewResume:      '⬆️ Upload New Resume',
    answerToTailor:       'Answer these to tailor your CV:',
    missing:              'Missing:',
    answerPlaceholder:    'Your answer…',
    generateTailoredCV:   '✨ Generate Tailored CV',
    generatingCV:         'Generating Tailored CV…',
    tailoredCVReady:      'Tailored CV ready!',
    downloadDocx:         'Download .docx',
    regenerateCV:         '✨ Regenerate CV',
    gapAnalysisPlaceholder: 'Click "Analyze Gaps" to compare your resume against this job and find what\'s missing. Answer the questions to generate a tailored CV.',
    notes:                'Notes & Reminders',
    notesPlaceholder:     'Add interview notes, follow-up reminders, or any other information...',
    saveNotes:            'Save',
    noNotesYet:           'No notes yet. Click Edit to add notes.',
    saveJobToAddNotes:    'Save this job to your tracker to add notes.',
    edit:                 'Edit',
    cancel:               'Cancel',
    interviewPrep:        'Interview Preparation',
    generating:           'Generating...',
    generateQuestions:    'Generate Questions',
    behavioralQuestions:  '💼 Behavioral Questions',
    technicalQuestions:   '⚙️ Technical Questions',
    questionsToAsk:       '🏢 Questions to Ask Them',
    regenerateQuestions:  '🔄 Regenerate Questions',
    interviewPrepPlaceholder: 'Click "Generate Questions" to get AI-powered interview prep questions tailored to this job.',
    salaryInsights:       'Salary Insights',
    estimating:           'Estimating...',
    estimateSalary:       'Estimate Salary',
    estimatedRange:       '💰 Estimated Range',
    minimum:              'Minimum',
    median:               'Median',
    maximum:              'Maximum',
    keyInsights:          '💡 Key Insights',
    salaryFactors:        '📊 Salary Factors',
    recalculate:          '🔄 Recalculate Estimate',
    salaryPlaceholder:    'Click "Estimate Salary" to get AI-powered salary insights for this position.',
    saveToMyJobs:         'Save to My Jobs',
    applicationStatus:    'Application Status',
    status:               'Status',
    added:                'Added',
    appliedDate:          'Applied Date',
    interviewDate:        'Interview Date',
    actions:              'Actions',
    applyNow:             'Apply Now',
    viewAllApplications:  'View All Applications',
    upgradeTitle:         'Pro Feature',
    upgradeDesc:          'Interview prep, salary insights, and resume gap analysis are available on the Pro plan.',
    upgradeBtn:           'Upgrade to Pro',
  },
  he: {
    backToJobs:           'חזרה למשרות',
    match:                'התאמה',
    yourRole:             'התפקיד שלך',
    yourExperience:       'הניסיון שלך',
    required:             'נדרש',
    yrs:                  'שנים',
    jobDescription:       'תיאור המשרה',
    aiCoverLetter:        'יצירת מכתב מקדים עם AI',
    saveJobFirstDesc:     'שמור את המשרה ראשון כדי ליצור מכתב מקדים מותאם אישית.',
    saveJobFirst:         'שמור משרה ראשון',
    saving:               'שומר…',
    resumeGapAnalysis:    'ניתוח פערים בקורות חיים',
    analyzing:            'מנתח…',
    reanalyze:            '🔄 נתח מחדש',
    analyzeGaps:          'נתח פערים',
    useSavedResume:       '📄 השתמש בקורות חיים שמורים',
    uploadNewResume:      '⬆️ העלה קורות חיים חדשים',
    answerToTailor:       'ענה על שאלות אלה כדי להתאים את קורות החיים שלך:',
    missing:              'חסר:',
    answerPlaceholder:    'התשובה שלך…',
    generateTailoredCV:   '✨ צור קורות חיים מותאמים',
    generatingCV:         'יוצר קורות חיים מותאמים…',
    tailoredCVReady:      'קורות חיים מותאמים מוכנים!',
    downloadDocx:         'הורד .docx',
    regenerateCV:         '✨ צור מחדש',
    gapAnalysisPlaceholder: 'לחץ על "נתח פערים" להשוות את קורות החיים למשרה ולמצוא מה חסר. ענה על השאלות כדי ליצור קורות חיים מותאמים.',
    notes:                'הערות ותזכורות',
    notesPlaceholder:     'הוסף הערות על ראיון, תזכורות מעקב, או מידע נוסף...',
    saveNotes:            'שמור',
    noNotesYet:           'אין הערות עדיין. לחץ "ערוך" להוסיף.',
    saveJobToAddNotes:    'שמור את המשרה כדי להוסיף הערות.',
    edit:                 'ערוך',
    cancel:               'ביטול',
    interviewPrep:        'הכנה לראיון',
    generating:           'מייצר...',
    generateQuestions:    'צור שאלות',
    behavioralQuestions:  '💼 שאלות התנהגותיות',
    technicalQuestions:   '⚙️ שאלות טכניות',
    questionsToAsk:       '🏢 שאלות לשאול אותם',
    regenerateQuestions:  '🔄 צור שאלות מחדש',
    interviewPrepPlaceholder: 'לחץ על "צור שאלות" לקבל שאלות הכנה לראיון מבוסס AI המותאמות למשרה זו.',
    salaryInsights:       'תובנות שכר',
    estimating:           'מעריך...',
    estimateSalary:       'הערכת שכר',
    estimatedRange:       '💰 טווח משוער',
    minimum:              'מינימום',
    median:               'חציון',
    maximum:              'מקסימום',
    keyInsights:          '💡 תובנות מפתח',
    salaryFactors:        '📊 גורמי שכר',
    recalculate:          '🔄 חשב מחדש',
    salaryPlaceholder:    'לחץ על "הערכת שכר" לקבל תובנות שכר מבוסס AI לתפקיד זה.',
    saveToMyJobs:         'שמור למשרות שלי',
    applicationStatus:    'סטטוס בקשה',
    status:               'סטטוס',
    added:                'נוסף',
    appliedDate:          'תאריך הגשה',
    interviewDate:        'תאריך ראיון',
    actions:              'פעולות',
    applyNow:             'הגש עכשיו',
    viewAllApplications:  'כל הבקשות שלי',
    upgradeTitle:         'תכונת Pro',
    upgradeDesc:          'הכנה לראיון, תובנות שכר וניתוח פערים זמינים בתוכנית ה-Pro.',
    upgradeBtn:           'שדרג ל-Pro',
  },
};

export default function JobDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getToken } = useAuth();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const jd = isHebrew ? JD.he : JD.en;
  const isPro = user?.subscription_tier === 'pro';
  const [showWaitlist, setShowWaitlist] = React.useState(false);
  const [limitHit, setLimitHit] = React.useState({});   // { feature: true }

  const { data: usageData } = useQuery({
    queryKey: ['usage-today'],
    queryFn: usageApi.getToday,
    staleTime: 0,
  });

  const FREE_LIMIT = 5;
  const usageLeft = (feature) => {
    if (isPro) return null;
    const used = usageData?.usage?.[feature] ?? 0;
    return Math.max(0, FREE_LIMIT - used);
  };

  const handleLimitError = (err, feature) => {
    if (err?.message?.includes('daily_limit_reached') || String(err).includes('429')) {
      setLimitHit(prev => ({ ...prev, [feature]: true }));
    }
  };
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  // Feed job passed via navigate state (not yet saved to tracker)
  const feedJob = location.state?.feedJob || null;

  const [trackedJobId, setTrackedJobId] = React.useState(jobId);
  const [notes, setNotes] = React.useState('');
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [interviewQuestions, setInterviewQuestions] = React.useState(null);
  const [showInterviewQuestions, setShowInterviewQuestions] = React.useState(false);
  const [salaryEstimate, setSalaryEstimate] = React.useState(null);
  const [showSalaryEstimate, setShowSalaryEstimate] = React.useState(false);
  const [gapAnalysis, setGapAnalysis] = React.useState(null);
  const [showGapAnalysis, setShowGapAnalysis] = React.useState(false);
  const [gapAnswers, setGapAnswers] = React.useState({});
  const [tailoredCv, setTailoredCv] = React.useState(null);
  // Resume source for gap analysis: 'saved' or 'upload'
  const [gapResumeSource, setGapResumeSource] = React.useState(user?.resume_filename ? 'saved' : 'upload');
  const [gapResumeFile, setGapResumeFile] = React.useState(null);

  // Lazily save a feed job to the tracker the first time an AI feature is used
  const lazyTrackMutation = useMutation({
    mutationFn: () => jobApi.create(user.id, {
      title: feedJob.title,
      company: feedJob.company || 'Unknown',
      location: feedJob.location || '',
      description: feedJob.description || '',
      url: feedJob.url || '',
      source: feedJob.source || 'other',
      status: 'saved',
    }),
    onSuccess: (saved) => {
      setTrackedJobId(String(saved.id));
      window.history.replaceState({}, '', `${window.location.pathname}?id=${saved.id}`);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job saved to your applications');
    },
  });

  const ensureTracked = async () => {
    if (trackedJobId) return trackedJobId;
    const saved = await lazyTrackMutation.mutateAsync();
    return String(saved.id);
  };

  const analyzeGapsMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      let resumeFile;
      if (gapResumeSource === 'upload' && gapResumeFile) {
        resumeFile = gapResumeFile;
      } else {
        resumeFile = await resumeApi.getSavedFile(token, user.resume_filename || 'resume.pdf');
      }
      return resumeApi.analyzeGaps(resumeFile, effectiveJob.description, token);
    },
    onSuccess: (data) => {
      setGapAnalysis(data);
      setGapAnswers({});
      setTailoredCv(null);
      setShowGapAnalysis(true);
      queryClient.invalidateQueries({ queryKey: ['usage-today'] });
      toast.success(isHebrew ? 'ניתוח הפערים הושלם!' : 'Gap analysis complete!');
    },
    onError: (err) => {
      handleLimitError(err, 'resume_gaps');
      if (!err?.message?.includes('daily_limit_reached') && !String(err).includes('429')) {
        toast.error(err.message || 'Failed to analyze resume gaps');
      }
    },
  });

  const generateTailoredCvMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      let resumeFile;
      if (gapResumeSource === 'upload' && gapResumeFile) {
        resumeFile = gapResumeFile;
      } else {
        resumeFile = await resumeApi.getSavedFile(token, user.resume_filename || 'resume.pdf');
      }
      const answersText = (gapAnalysis?.gaps || [])
        .map((gap, i) =>
          gapAnswers[i]?.trim()
            ? `Requirement: ${gap.requirement}\nQuestion: ${gap.question}\nAnswer: ${gapAnswers[i]}`
            : null
        )
        .filter(Boolean)
        .join('\n\n');
      return resumeApi.rewriteDiff(resumeFile, effectiveJob.description, token, answersText);
    },
    onSuccess: (data) => {
      setTailoredCv(data);
      toast.success(isHebrew ? 'קורות חיים מותאמים נוצרו!' : 'Tailored CV generated!');
    },
    onError: (err) => toast.error(err.message || 'Failed to generate tailored CV'),
  });

  const generateSalaryMutation = useMutation({
    mutationFn: async () => {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const langParam = isHebrew ? '?lang=he' : '';
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('hirematex_auth_token')}` };
      let response;
      if (trackedJobId) {
        response = await fetch(`${API}/api/jobs/${trackedJobId}/salary-estimate${langParam}`, { headers });
      } else {
        response = await fetch(`${API}/api/jobs/salary-estimate-inline${langParam}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: effectiveJob?.title, location: effectiveJob?.location }),
        });
      }
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(response.status === 429 ? `daily_limit_reached:salary_estimate` : (d.detail || 'Failed to estimate salary'));
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSalaryEstimate(data.salary_estimate);
      setShowSalaryEstimate(true);
      queryClient.invalidateQueries({ queryKey: ['usage-today'] });
      toast.success(isHebrew ? 'הערכת שכר הושלמה!' : 'Salary estimate generated!');
    },
    onError: (err) => {
      handleLimitError(err, 'salary_estimate');
      if (!String(err?.message).includes('daily_limit_reached')) toast.error('Failed to estimate salary');
    },
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async () => {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const langParam = isHebrew ? '?lang=he' : '';
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('hirematex_auth_token')}` };
      let response;
      if (trackedJobId) {
        response = await fetch(`${API}/api/jobs/${trackedJobId}/interview-questions${langParam}`, { headers });
      } else {
        response = await fetch(`${API}/api/jobs/interview-questions-inline${langParam}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: effectiveJob?.title, company: effectiveJob?.company, description: effectiveJob?.description }),
        });
      }
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(response.status === 429 ? `daily_limit_reached:interview_questions` : (d.detail || 'Failed to generate questions'));
      }
      return response.json();
    },
    onSuccess: (data) => {
      setInterviewQuestions(data.questions);
      setShowInterviewQuestions(true);
      queryClient.invalidateQueries({ queryKey: ['usage-today'] });
      toast.success(isHebrew ? 'שאלות הכנה לראיון נוצרו!' : 'Interview questions generated!');
    },
    onError: (err) => {
      handleLimitError(err, 'interview_questions');
      if (!String(err?.message).includes('daily_limit_reached')) toast.error('Failed to generate interview questions');
    },
  });

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => await jobApi.getById(parseInt(jobId)),
    enabled: !!jobId,
  });

  // Effective job: from API (tracked) or from router state (feed/discover)
  const effectiveJob = job || feedJob;

  React.useEffect(() => {
    if (job?.notes) setNotes(job.notes);
  }, [job]);

  const updateNotesMutation = useMutation({
    mutationFn: async (noteText) => {
      if (!trackedJobId) throw new Error('Save the job first to add notes.');
      return jobApi.update(parseInt(trackedJobId), { notes: noteText });
    },
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(['job', jobId], updatedJob);
      setIsEditingNotes(false);
      toast.success('Notes saved');
    },
    onError: (error) => toast.error(error.message || 'Failed to save notes'),
  });

  const calculateMatchScore = () => {
    if (!effectiveJob) return 0;
    if (effectiveJob.match_score) return effectiveJob.match_score;
    if (!user?.skills) return 0;
    const skills = typeof user.skills === 'string' ? user.skills.split(',').map(s => s.trim()) : user.skills;
    if (!skills.length) return 0;
    const jobText = `${effectiveJob.title} ${effectiveJob.description}`.toLowerCase();
    const matches = skills.filter(skill => jobText.includes(skill.toLowerCase()));
    return Math.min(100, Math.round((matches.length / skills.length) * 100));
  };

  const matchScore = calculateMatchScore();

  const extractRequiredYears = () => {
    if (!effectiveJob?.description) return null;
    const match =
      effectiveJob.description.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*years?\s+(?:of\s+)?(?:experience|exp)/i) ||
      effectiveJob.description.match(/experience[:\s]+(\d+)\+?\s*years?/i) ||
      effectiveJob.description.match(/minimum\s+(\d+)\s*years?/i);
    return match ? parseInt(match[1]) : null;
  };

  const requiredYears = extractRequiredYears();
  const hasAnswers = Object.values(gapAnswers).some(a => a?.trim());

  const downloadCV = () => {
    if (!tailoredCv?.docx_b64) return;
    const bytes = atob(tailoredCv.docx_b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored_cv.docx';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (jobLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!effectiveJob) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>Job not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto">
      <WaitlistDialog open={showWaitlist} onClose={() => setShowWaitlist(false)} />
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Jobs"))}
        className="mb-4 md:mb-6 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {jd.backToJobs}
      </Button>

      {/* Job Header */}
      <Card className="border border-gray-100 mb-6 md:mb-8">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 leading-snug">{effectiveJob.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-gray-400 text-sm">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {effectiveJob.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {effectiveJob.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Details */}
            <div className="w-full md:w-auto bg-gray-50 p-4 md:p-5 rounded-lg md:space-y-4 flex md:block items-center gap-6 md:gap-0 md:min-w-[180px]">
              <div className="text-center shrink-0">
                <div className={`text-3xl md:text-4xl font-semibold mb-0.5 ${
                  matchScore >= 70 ? 'text-green-500' :
                  matchScore >= 50 ? 'text-yellow-500' : 'text-gray-400'
                }`}>
                  {matchScore}%
                </div>
                <p className="text-xs text-gray-500">{jd.match}</p>
              </div>
              <div className="hidden md:block border-t border-gray-200 pt-3 space-y-2.5">
                {user?.target_role && (
                  <div>
                    <p className="text-xs text-gray-500">{jd.yourRole}</p>
                    <p className="text-sm text-gray-900 font-medium truncate">{user.target_role}</p>
                  </div>
                )}
                {user?.years_of_experience != null && (
                  <div>
                    <p className="text-xs text-gray-500">{jd.yourExperience}</p>
                    <p className="text-sm text-gray-900 font-medium">{user.years_of_experience} {jd.yrs}</p>
                  </div>
                )}
                {requiredYears && (
                  <div>
                    <p className="text-xs text-gray-500">{jd.required}</p>
                    <p className={`text-sm font-medium ${
                      user?.years_of_experience != null
                        ? user.years_of_experience >= requiredYears ? 'text-green-400' : 'text-amber-400'
                        : 'text-gray-900'
                    }`}>
                      {requiredYears}+ yrs
                      {user?.years_of_experience != null && (
                        <span className="ml-1 text-xs">
                          {user.years_of_experience >= requiredYears ? '✓' : '✗'}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              <div className="md:hidden flex flex-wrap gap-3 text-xs">
                {user?.target_role && <span className="text-gray-400">{user.target_role}</span>}
                {user?.years_of_experience != null && <span className="text-gray-400">{user.years_of_experience} yrs exp</span>}
                {requiredYears && (
                  <span className={user?.years_of_experience != null
                    ? user.years_of_experience >= requiredYears ? 'text-green-400' : 'text-amber-400'
                    : 'text-gray-400'}>
                    {requiredYears}+ yrs required
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6 min-w-0">

          {/* Description */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="font-semibold">{jd.jobDescription}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap break-words overflow-hidden">{effectiveJob.description}</p>
            </CardContent>
          </Card>

          {/* Cover Letter Generator */}
          {trackedJobId ? (
            <CoverLetterGenerator job={{ ...effectiveJob, id: parseInt(trackedJobId) }} />
          ) : (
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle className="font-semibold">{jd.aiCoverLetter}</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-6">
                <p className="text-sm text-gray-400 mb-4">
                  {jd.saveJobFirstDesc}
                </p>
                <Button
                  variant="outline"
                  onClick={() => lazyTrackMutation.mutate()}
                  disabled={lazyTrackMutation.isPending}
                >
                  {lazyTrackMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{jd.saving}</>
                    : <><Bookmark className="w-4 h-4 mr-2" />{jd.saveJobFirst}</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resume Gap Analysis */}
          <Card className="border border-purple-200 bg-purple-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold flex items-center gap-2">
                  <ScanSearch className="w-5 h-5 text-purple-600" />
                  {jd.resumeGapAnalysis}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!isPro && usageLeft('resume_gaps') !== null && !limitHit.resume_gaps && (
                    <span className="text-xs text-gray-400">{usageLeft('resume_gaps')}/{FREE_LIMIT} left</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeGapsMutation.mutate()}
                    disabled={analyzeGapsMutation.isPending || (gapResumeSource === 'upload' && !gapResumeFile)}
                    className="text-purple-600 border-purple-300 hover:bg-purple-100"
                  >
                    {analyzeGapsMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />{jd.analyzing}</>
                    ) : showGapAnalysis ? (
                      <>{jd.reanalyze}</>
                    ) : (
                      <><ScanSearch className="w-4 h-4 mr-2" />{jd.analyzeGaps}</>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {limitHit.resume_gaps ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                  <p className="font-semibold text-gray-700">Daily limit reached</p>
                  <p className="text-sm text-gray-500 max-w-xs">You've used all 5 free gap analyses for today. Join the waitlist for unlimited access.</p>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white mt-1" onClick={() => setShowWaitlist(true)}>
                    {jd.upgradeBtn}
                  </Button>
                </div>
              ) : (
              <>
              {/* Resume source picker */}
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  {user?.resume_filename && (
                    <button
                      onClick={() => setGapResumeSource('saved')}
                      className={`flex-1 text-xs px-3 py-2 rounded-lg border transition-colors ${
                        gapResumeSource === 'saved'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {jd.useSavedResume}
                    </button>
                  )}
                  <button
                    onClick={() => setGapResumeSource('upload')}
                    className={`flex-1 text-xs px-3 py-2 rounded-lg border transition-colors ${
                      gapResumeSource === 'upload'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    {jd.uploadNewResume}
                  </button>
                </div>
                {gapResumeSource === 'upload' && (
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-50 transition-colors">
                    <Upload className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-xs text-purple-700 truncate">
                      {gapResumeFile ? gapResumeFile.name : (isHebrew ? 'בחר קובץ PDF / DOCX' : 'Choose PDF or DOCX')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={(e) => setGapResumeFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {showGapAnalysis && gapAnalysis ? (
                <div className="space-y-5">
                  {gapAnalysis.summary && (
                    <p className="text-sm text-gray-700 bg-white rounded-lg border border-purple-100 p-3">
                      {gapAnalysis.summary}
                    </p>
                  )}

                  {gapAnalysis.gaps?.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                        {jd.answerToTailor}
                      </p>
                      {gapAnalysis.gaps.map((gap, i) => (
                        <div key={i} className="bg-white rounded-lg border border-purple-100 p-4 space-y-3">
                          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                            {jd.missing} {gap.requirement}
                          </p>
                          <p className="text-sm text-gray-700">💬 {gap.question}</p>
                          <Textarea
                            placeholder={jd.answerPlaceholder}
                            value={gapAnswers[i] || ''}
                            onChange={(e) => setGapAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                            className="min-h-[72px] text-sm resize-none bg-gray-50 border-purple-100 focus:border-purple-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!tailoredCv ? (
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => generateTailoredCvMutation.mutate()}
                      disabled={generateTailoredCvMutation.isPending || !hasAnswers}
                    >
                      {generateTailoredCvMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{jd.generatingCV}</>
                      ) : (
                        <>{jd.generateTailoredCV}</>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-white rounded-lg border border-purple-100 p-3">
                        <p className="text-sm font-semibold text-purple-700">
                          {jd.tailoredCVReady}
                        </p>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={downloadCV}>
                          <FileDown className="w-4 h-4 mr-2" /> {jd.downloadDocx}
                        </Button>
                      </div>
                      {tailoredCv.diff?.length > 0 && (
                        <div className="bg-gray-900 rounded-lg p-4 max-h-72 overflow-y-auto text-xs font-mono space-y-0.5">
                          {tailoredCv.diff.map((chunk, i) => (
                            <div
                              key={i}
                              className={
                                chunk.type === 'insert' ? 'text-green-400' :
                                chunk.type === 'delete' ? 'text-red-400 line-through opacity-70' :
                                'text-gray-500'
                              }
                            >
                              {chunk.type === 'insert' ? '+ ' : chunk.type === 'delete' ? '- ' : '  '}
                              {chunk.text}
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => generateTailoredCvMutation.mutate()}
                        disabled={generateTailoredCvMutation.isPending}
                      >
                        {jd.regenerateCV}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  {jd.gapAnalysisPlaceholder}
                </p>
              )}
              </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border border-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-blue-600" />
                  {jd.notes}
                </CardTitle>
                {trackedJobId && !isEditingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                    {jd.edit}
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
                    placeholder={jd.notesPlaceholder}
                    className="min-h-[120px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateNotesMutation.mutate(notes)}
                      disabled={updateNotesMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateNotesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {jd.saveNotes}
                    </Button>
                    <Button variant="outline" onClick={() => { setNotes(job?.notes || ''); setIsEditingNotes(false); }}>
                      {jd.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {notes ? (
                    <p className="text-gray-700 whitespace-pre-wrap break-words overflow-hidden">{notes}</p>
                  ) : trackedJobId ? (
                    <p className="text-gray-400 italic text-sm">{jd.noNotesYet}</p>
                  ) : (
                    <p className="text-gray-400 italic text-sm">{jd.saveJobToAddNotes}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interview Preparation */}
          <Card className="border border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  {jd.interviewPrep}
                </CardTitle>
                {!showInterviewQuestions && (
                  <div className="flex items-center gap-2">
                    {!isPro && usageLeft('interview_questions') !== null && !limitHit.interview_questions && (
                      <span className="text-xs text-gray-400">{usageLeft('interview_questions')}/{FREE_LIMIT} left</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateQuestionsMutation.mutate()}
                      disabled={generateQuestionsMutation.isPending}
                      className="text-blue-600 border-indigo-300 hover:bg-indigo-100"
                    >
                      {generateQuestionsMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />{jd.generating}</>
                      ) : (
                        <><Lightbulb className="w-4 h-4 mr-2" />{jd.generateQuestions}</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {limitHit.interview_questions ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                  <p className="font-semibold text-gray-700">Daily limit reached</p>
                  <p className="text-sm text-gray-500 max-w-xs">You've used all 5 free interview prep sessions for today. Join the waitlist for unlimited access.</p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-1" onClick={() => setShowWaitlist(true)}>
                    {jd.upgradeBtn}
                  </Button>
                </div>
              ) : showInterviewQuestions && interviewQuestions ? (
                <div className="space-y-6">
                  {interviewQuestions.behavioral && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{jd.behavioralQuestions}</h4>
                      <ul className="space-y-2">
                        {interviewQuestions.behavioral.map((q, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-indigo-300 py-1">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {interviewQuestions.technical && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{jd.technicalQuestions}</h4>
                      <ul className="space-y-2">
                        {interviewQuestions.technical.map((q, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-indigo-300 py-1">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {interviewQuestions.company_specific && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{jd.questionsToAsk}</h4>
                      <ul className="space-y-2">
                        {interviewQuestions.company_specific.map((q, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-indigo-300 py-1">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => generateQuestionsMutation.mutate()} className="w-full">
                    {jd.regenerateQuestions}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  {jd.interviewPrepPlaceholder}
                </p>
              )}
            </CardContent>
          </Card>


          {/* Salary Insights */}
          <Card className="border border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  {jd.salaryInsights}
                </CardTitle>
                {!showSalaryEstimate && (
                  <div className="flex items-center gap-2">
                    {!isPro && usageLeft('salary_estimate') !== null && !limitHit.salary_estimate && (
                      <span className="text-xs text-gray-400">{usageLeft('salary_estimate')}/{FREE_LIMIT} left</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateSalaryMutation.mutate()}
                      disabled={generateSalaryMutation.isPending}
                      className="text-green-600 border-green-300 hover:bg-green-900/40"
                    >
                      {generateSalaryMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />{jd.estimating}</>
                      ) : (
                        <><TrendingUp className="w-4 h-4 mr-2" />{jd.estimateSalary}</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {limitHit.salary_estimate ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <Sparkles className="w-8 h-8 text-green-400" />
                  <p className="font-semibold text-gray-700">Daily limit reached</p>
                  <p className="text-sm text-gray-500 max-w-xs">You've used all 5 free salary estimates for today. Join the waitlist for unlimited access.</p>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white mt-1" onClick={() => setShowWaitlist(true)}>
                    {jd.upgradeBtn}
                  </Button>
                </div>
              ) : showSalaryEstimate && salaryEstimate ? (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{jd.estimatedRange}</h4>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">monthly · ILS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-400">{jd.minimum}</p>
                        <p className="text-xl font-bold text-green-700">₪{salaryEstimate.min_salary ? Math.round(salaryEstimate.min_salary / 1000) + 'k' : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">{jd.median}</p>
                        <p className="text-2xl font-bold text-green-600">₪{salaryEstimate.median_salary ? Math.round(salaryEstimate.median_salary / 1000) + 'k' : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">{jd.maximum}</p>
                        <p className="text-xl font-bold text-green-700">₪{salaryEstimate.max_salary ? Math.round(salaryEstimate.max_salary / 1000) + 'k' : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  {salaryEstimate.insights && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{jd.keyInsights}</h4>
                      <ul className="space-y-2">
                        {salaryEstimate.insights.map((insight, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-green-300 py-1">{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {salaryEstimate.factors && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{jd.salaryFactors}</h4>
                      <div className="space-y-2">
                        {Object.entries(salaryEstimate.factors).map(([key, value], idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium text-gray-900 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="text-gray-600 ml-2">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => generateSalaryMutation.mutate()} className="w-full">
                    {jd.recalculate}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  {jd.salaryPlaceholder}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-w-0">

          {/* Save / Track button */}
          {trackedJobId ? (
            <SaveJobButton
              job={{ ...effectiveJob, id: parseInt(trackedJobId) }}
              isSaved={job?.status === 'saved' || !jobId}
            />
          ) : (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => lazyTrackMutation.mutate()}
              disabled={lazyTrackMutation.isPending}
            >
              {lazyTrackMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{jd.saving}</>
                : <><Bookmark className="w-4 h-4 mr-2" />{jd.saveToMyJobs}</>}
            </Button>
          )}

          {/* Application Status — only when tracked */}
          {trackedJobId && (
            <Card className="border border-gray-100">
              <CardHeader>
                <CardTitle className="font-semibold text-sm">{jd.applicationStatus}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{jd.status}</p>
                  <p className="font-medium capitalize">{job?.status || 'saved'}</p>
                </div>
                {job?.created_at && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{jd.added}</p>
                    <p className="font-medium text-sm">{formatDateIL(job.created_at)}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" /> {jd.appliedDate}
                  </Label>
                  <Input
                    type="date"
                    defaultValue={job?.applied_date ? new Date(job.applied_date).toISOString().split('T')[0] : ''}
                    className="h-8 text-sm"
                    onChange={(e) => {
                      jobApi.update(parseInt(trackedJobId), { applied_date: e.target.value || null })
                        .then(() => queryClient.invalidateQueries({ queryKey: ['job', trackedJobId] }));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" /> {jd.interviewDate}
                  </Label>
                  <Input
                    type="date"
                    defaultValue={job?.interview_date ? new Date(job.interview_date).toISOString().split('T')[0] : ''}
                    className="h-8 text-sm"
                    onChange={(e) => {
                      jobApi.update(parseInt(trackedJobId), { interview_date: e.target.value || null })
                        .then(() => queryClient.invalidateQueries({ queryKey: ['job', trackedJobId] }));
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border border-gray-100">
            <CardHeader>
              <CardTitle className="font-semibold text-sm">{jd.actions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {effectiveJob.url && (
                <a
                  href={effectiveJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={() => {
                    if (trackedJobId) {
                      jobApi.update(parseInt(trackedJobId), { status: 'applied' })
                        .then(() => queryClient.invalidateQueries({ queryKey: ['job', trackedJobId] }))
                        .catch(() => {});
                    }
                  }}
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    {jd.applyNow}
                  </Button>
                </a>
              )}
              <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl("Applications"))}>
                {jd.viewAllApplications}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
