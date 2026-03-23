import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { resumeApi, jobsApi } from "@/api/jobmate";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ExternalLink, MapPin, Building2, Sparkles,
  FileText, Loader2, Download, CheckCircle2, ChevronDown, ChevronUp,
  AlertCircle, MessageSquare, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Intra-line character diff helper
// Returns { prefix, removed, added, suffix }
// ---------------------------------------------------------------------------
function charDiff(oldStr, newStr) {
  let i = 0;
  while (i < oldStr.length && i < newStr.length && oldStr[i] === newStr[i]) i++;
  const prefix = oldStr.slice(0, i);
  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (oldEnd > i && newEnd > i && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  return {
    prefix,
    removed: oldStr.slice(i, oldEnd),
    added: newStr.slice(i, newEnd),
    suffix: oldStr.slice(oldEnd),
  };
}

// Whether two lines are similar enough to warrant intra-line diff (>50% shared)
function areSimilar(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let aEnd = a.length, bEnd = b.length;
  while (aEnd > i && bEnd > i && a[aEnd - 1] === b[bEnd - 1]) { aEnd--; bEnd--; }
  const common = i + (a.length - aEnd);
  return common / Math.max(a.length, b.length, 1) > 0.5;
}

// Merge consecutive (removed, added) pairs that are similar into "modified" entries
function processInlineDiff(rawLines) {
  const result = [];
  let i = 0;
  while (i < rawLines.length) {
    const l = rawLines[i];
    if (
      l.type === "removed" &&
      i + 1 < rawLines.length &&
      rawLines[i + 1].type === "added" &&
      areSimilar(l.text, rawLines[i + 1].text)
    ) {
      result.push({ type: "modified", oldText: l.text, newText: rawLines[i + 1].text });
      i += 2;
    } else {
      result.push(l);
      i++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Diff line renderers
// ---------------------------------------------------------------------------
function DiffLine({ type, text }) {
  if (type === "added") {
    return (
      <div className="flex gap-2 bg-green-900/20 border-l-4 border-green-500 px-3 py-0.5">
        <span className="select-none text-green-600 font-bold font-mono text-xs w-3 shrink-0">+</span>
        <span className="font-mono text-xs text-green-300 break-all">{text}</span>
      </div>
    );
  }
  if (type === "removed") {
    return (
      <div className="flex gap-2 bg-red-900/20 border-l-4 border-red-500 px-3 py-0.5 opacity-80">
        <span className="select-none text-red-500 font-bold font-mono text-xs w-3 shrink-0">−</span>
        <span className="font-mono text-xs text-red-300 line-through break-all">{text}</span>
      </div>
    );
  }
  // context
  return (
    <div className="flex gap-2 px-3 py-0.5">
      <span className="w-3 shrink-0" />
      <span className="font-mono text-xs text-gray-500 break-all">{text}</span>
    </div>
  );
}

// Single line showing only what changed inline (~ prefix for "modified")
function ModifiedLine({ oldText, newText }) {
  const { prefix, removed, added, suffix } = charDiff(oldText, newText);
  return (
    <div className="flex gap-2 bg-yellow-900/20 border-l-4 border-yellow-500 px-3 py-0.5">
      <span className="select-none text-yellow-600 font-bold font-mono text-xs w-3 shrink-0">~</span>
      <span className="font-mono text-xs break-all">
        <span className="text-gray-300">{prefix}</span>
        {removed && (
          <span className="bg-red-200 text-red-300 line-through">{removed}</span>
        )}
        {added && (
          <span className="bg-green-200 text-green-300">{added}</span>
        )}
        <span className="text-gray-300">{suffix}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match score badge
// ---------------------------------------------------------------------------
function ScoreBadge({ score }) {
  const color =
    score >= 70 ? "text-green-700 bg-green-900/40 border-green-300" :
    score >= 40 ? "text-yellow-700 bg-yellow-900/40 border-yellow-300" :
    "text-gray-400 bg-white/10 border-gray-300";
  return (
    <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 shrink-0 ${color}`}>
      <span className="text-2xl font-bold leading-none">{score}%</span>
      <span className="text-[10px] mt-0.5 font-medium">match</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapse context lines: show only changed lines + N surrounding context
// ---------------------------------------------------------------------------
const CONTEXT_WINDOW = 2;

function collapseContext(diffLines) {
  // Mark which indices are "near" a change
  const changed = new Set();
  diffLines.forEach((l, i) => {
    if (l.type !== "context" && l.type !== "ellipsis") {
      for (let j = Math.max(0, i - CONTEXT_WINDOW); j <= Math.min(diffLines.length - 1, i + CONTEXT_WINDOW); j++) {
        changed.add(j);
      }
    }
  });

  const result = [];
  let skipped = 0;
  diffLines.forEach((l, i) => {
    if (changed.has(i)) {
      if (skipped > 0) {
        result.push({ type: "ellipsis", text: `··· ${skipped} unchanged lines ···`, key: `skip-${i}` });
        skipped = 0;
      }
      result.push({ ...l, key: i });
    } else {
      skipped++;
    }
  });
  if (skipped > 0) {
    result.push({ type: "ellipsis", text: `··· ${skipped} unchanged lines ···`, key: "skip-end" });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function JobMatch() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, getToken } = useAuth();

  const job = state?.job;

  // Full description lazy-fetch
  const [fullDescription, setFullDescription] = useState(null);
  const [isFetchingDesc, setIsFetchingDesc] = useState(false);
  const [descBlocked, setDescBlocked] = useState(false);

  useEffect(() => {
    if (!job?.url) return;
    setIsFetchingDesc(true);
    setDescBlocked(false);
    jobsApi.fetchDescription(job.url, user?.id)
      .then(data => setFullDescription(data.description))
      .catch((err) => {
        // 403 = LinkedIn login-wall; surface a note instead of silent fallback
        if (err?.status === 403 || err?.message?.includes('403')) setDescBlocked(true);
      })
      .finally(() => setIsFetchingDesc(false));
  }, [job?.url]);

  // Resume diff state
  const [resumeFile, setResumeFile] = useState(null);
  const [usingSavedResume, setUsingSavedResume] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Gap analysis Q&A flow
  // step: 'idle' | 'analyzing-gaps' | 'gap-qa' | 'rewriting' | 'done'
  const [flowStep, setFlowStep] = useState("idle");
  const [gapAnalysis, setGapAnalysis] = useState(null); // {summary, gaps:[]}
  const [gapAnswers, setGapAnswers] = useState({}); // { [gapIndex]: string }
  const [diffResult, setDiffResult] = useState(null); // {diff, docx_b64}
  const [showFullDiff, setShowFullDiff] = useState(false);

  // Compute match analysis: user skills vs job skills tags + full description text
  const matchAnalysis = useMemo(() => {
    const userSkills = (user?.skills || []).map(s =>
      typeof s === "string" ? s.toLowerCase() : ""
    ).filter(Boolean);

    // Combine job skill tags + any user skill found anywhere in the description
    const descText = (fullDescription || job?.description || job?.title || "").toLowerCase();
    const jobTagSkills = (job?.skills || []);

    // Skills user has that appear in job tags OR description text
    const matched = userSkills.filter(s =>
      jobTagSkills.some(t => t.toLowerCase() === s) || descText.includes(s)
    );

    // Job tag skills the user doesn't have
    const missing = jobTagSkills.filter(s =>
      !userSkills.includes(s.toLowerCase())
    );

    return { matched, missing };
  }, [user, job, fullDescription]);

  // Must be declared before any early return (Rules of Hooks)
  const processedDiff = useMemo(
    () => diffResult ? processInlineDiff(diffResult.diff) : [],
    [diffResult]
  );

  if (!job) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500 mb-4">No job data found.</p>
        <Button onClick={() => navigate(createPageUrl("Dashboard"))}>Back to Dashboard</Button>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".pdf") && !f.name.endsWith(".docx")) {
      toast.error("Please upload a PDF or DOCX file"); return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB"); return;
    }
    setResumeFile(f);
    setDiffResult(null);
    setGapAnalysis(null);
    setGapAnswers({});
    setFlowStep("idle");
  };

  const handleUseSavedResume = async () => {
    const token = getToken();
    if (!token) { toast.error("Session expired — please log in again."); return; }
    try {
      const file = await resumeApi.getSavedFile(token, user.resume_filename);
      setResumeFile(file);
      setUsingSavedResume(true);
      setDiffResult(null);
      setGapAnalysis(null);
      setGapAnswers({});
      setFlowStep("idle");
    } catch {
      toast.error("Could not load saved resume");
    }
  };

  const handleAnalyzeGaps = async () => {
    if (!resumeFile) { toast.error("Please upload your resume first"); return; }
    const token = getToken();
    if (!token) { toast.error("Session expired — please log in again."); return; }
    setFlowStep("analyzing-gaps");
    setGapAnalysis(null);
    setGapAnswers({});
    setDiffResult(null);
    try {
      const jd = fullDescription || job.description || job.title;
      const result = await resumeApi.analyzeGaps(resumeFile, jd, token);
      setGapAnalysis(result);
      setFlowStep("gap-qa");
    } catch (err) {
      toast.error(err.message || "Gap analysis failed");
      setFlowStep("idle");
    }
  };

  const handleGenerateDiff = async () => {
    const token = getToken();
    if (!token) { toast.error("Session expired — please log in again."); return; }
    setFlowStep("rewriting");
    setDiffResult(null);
    try {
      const jd = fullDescription || job.description || job.title;
      // Build extra context from answered questions
      const extraLines = (gapAnalysis?.gaps || [])
        .map((gap, i) => {
          const ans = (gapAnswers[i] || "").trim();
          return ans ? `${gap.requirement}: ${ans}` : null;
        })
        .filter(Boolean);
      const extraContext = extraLines.join("\n");
      const result = await resumeApi.rewriteDiff(resumeFile, jd, token, extraContext);
      setDiffResult(result);
      setFlowStep("done");
      toast.success("Analysis complete — review your changes below");
    } catch (err) {
      toast.error(err.message || "Analysis failed");
      setFlowStep("gap-qa");
    }
  };

  const handleApproveDownload = () => {
    if (!diffResult?.docx_b64) return;
    const bytes = Uint8Array.from(atob(diffResult.docx_b64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored_resume.docx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tailored resume downloaded!");
  };

  const collapsedDiff = diffResult ? collapseContext(processedDiff).map((l, i) => ({ ...l, key: l.key ?? i })) : [];
  const displayDiff = showFullDiff
    ? processedDiff.map((l, i) => ({ ...l, key: i }))
    : collapsedDiff;
  const changedCount = processedDiff.filter(l => l.type !== "context").length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* ── Job Header ────────────────────────────────────────────── */}
      <Card className="border border-white/5">
        <CardContent className="pt-6 flex gap-5 items-start">
          <ScoreBadge score={job.match_score ?? 0} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
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
              {job.experience_level && (
                <Badge variant="outline" className="text-xs">{job.experience_level}</Badge>
              )}
            </div>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Apply <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left column ──────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Match Analysis */}
          <Card className="border border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Match Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Overall match</span>
                  <span className="font-semibold">{job.match_score ?? 0}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (job.match_score ?? 0) >= 70 ? "bg-green-500" :
                      (job.match_score ?? 0) >= 40 ? "bg-yellow-500" : "bg-gray-400"
                    }`}
                    style={{ width: `${job.match_score ?? 0}%` }}
                  />
                </div>
              </div>

              {matchAnalysis.matched.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1.5">
                    ✓ Your skills in this job ({matchAnalysis.matched.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchAnalysis.matched.map((s, i) => (
                      <Badge key={i} className="text-xs bg-green-900/40 text-green-300 border-green-500/30 hover:bg-green-900/40">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {matchAnalysis.missing.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">
                    ○ Job also mentions ({matchAnalysis.missing.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchAnalysis.missing.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs text-gray-500">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 mt-3">
                Score is calculated from your skills vs job title, description, and tags.
              </p>

              {matchAnalysis.matched.length === 0 && matchAnalysis.missing.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No skill tags available for this job
                </p>
              )}
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card className="border border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex justify-between items-center">
                <span>Job Description</span>
                {!isFetchingDesc && (() => {
                  const desc = fullDescription || job.description || "";
                  const PREVIEW = 800;
                  return desc.length > PREVIEW ? (
                    <button
                      className="text-xs text-blue-600 hover:text-indigo-800 font-normal"
                      onClick={() => setShowFullDesc(v => !v)}
                    >
                      {showFullDesc ? "Show less" : "Show full"}
                    </button>
                  ) : null;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFetchingDesc ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-3 bg-white/20 rounded ${i === 5 ? "w-2/3" : "w-full"}`} />
                  ))}
                </div>
              ) : descBlocked ? (
                <div className="text-sm text-gray-400 py-2">
                  LinkedIn requires you to be logged in to view the full description.{" "}
                  {job.url && (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                      View on LinkedIn
                    </a>
                  )}
                  {job.description && (
                    <p className="mt-3 whitespace-pre-line text-gray-400">{job.description}</p>
                  )}
                </div>
              ) : (() => {
                const desc = fullDescription || job.description || "";
                const PREVIEW = 800;
                const displayed = desc.length > PREVIEW && !showFullDesc
                  ? desc.slice(0, PREVIEW) + "…"
                  : desc;
                return desc ? (
                  <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">
                    {displayed}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description available.</p>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column — Resume Diff ────────────────────────── */}
        <div>
          <Card className="border border-blue-500/20 bg-gradient-to-br from-white to-indigo-50/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Tailor Resume for This Job
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload your resume — we'll identify gaps and ask you a few questions before rewriting.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── Step 0: Resume picker ── */}
              <div className="space-y-2">
                {/* Saved resume option */}
                {user?.resume_filename && !resumeFile && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-500/20">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs text-gray-300 flex-1 truncate">{user.resume_filename}</span>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={handleUseSavedResume}
                      disabled={flowStep === "analyzing-gaps" || flowStep === "rewriting"}
                    >
                      Use saved resume
                    </Button>
                  </div>
                )}

                {/* Active resume + change option */}
                {resumeFile && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-950/30 border border-green-500/20">
                    <FileText className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-xs text-gray-300 flex-1 truncate">
                      {usingSavedResume ? "Saved: " : ""}{resumeFile.name}
                    </span>
                    {flowStep === "idle" && (
                      <button
                        className="text-xs text-gray-400 hover:text-red-400"
                        onClick={() => { setResumeFile(null); setUsingSavedResume(false); setDiffResult(null); setGapAnalysis(null); setFlowStep("idle"); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* File picker — always available to upload a different file */}
                {!resumeFile && (
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      id="job-match-resume"
                      onChange={handleFileChange}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("job-match-resume").click()}
                      disabled={flowStep === "analyzing-gaps" || flowStep === "rewriting"}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      {user?.resume_filename ? "Upload different resume" : "Choose Resume (PDF / DOCX)"}
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Step 1: Analyze Gaps button ── */}
              {flowStep === "idle" && (
                <Button
                  onClick={handleAnalyzeGaps}
                  disabled={!resumeFile}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Check Resume Gaps
                </Button>
              )}

              {/* ── Loading: gap analysis ── */}
              {flowStep === "analyzing-gaps" && (
                <div className="flex items-center gap-2 text-sm text-blue-600 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analysing your resume against the job requirements…
                </div>
              )}

              {/* ── Step 2: Gap Q&A form ── */}
              {flowStep === "gap-qa" && gapAnalysis && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">{gapAnalysis.summary}</p>
                  </div>

                  {gapAnalysis.gaps.length === 0 ? (
                    <p className="text-sm text-green-700 font-medium">
                      Great news — no significant gaps found! Your resume is a strong match.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        Answer any questions below to strengthen your resume (skip if not applicable):
                      </p>

                      <div className="space-y-4">
                        {gapAnalysis.gaps.map((gap, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex items-start gap-1.5">
                              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-900/30 border border-blue-500/30 rounded px-1.5 py-0.5 shrink-0">
                                {gap.requirement}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{gap.question}</p>
                            <Textarea
                              rows={2}
                              placeholder="Your answer (optional)…"
                              className="text-xs resize-none"
                              value={gapAnswers[i] || ""}
                              onChange={(e) => setGapAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateDiff}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                      Generate Tailored Resume
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-400"
                      onClick={() => { setFlowStep("idle"); setGapAnalysis(null); setGapAnswers({}); }}
                    >
                      Start over
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Loading: rewriting ── */}
              {flowStep === "rewriting" && (
                <div className="flex items-center gap-2 text-sm text-blue-600 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rewriting your resume (this takes ~20s)…
                </div>
              )}

              {/* ── Step 3: Diff viewer ── */}
              {flowStep === "done" && diffResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      <span className="text-green-600 font-semibold">
                        +{processedDiff.filter(l => l.type === "added").length}
                      </span>{" "}
                      added &nbsp;
                      <span className="text-red-500 font-semibold">
                        −{processedDiff.filter(l => l.type === "removed").length}
                      </span>{" "}
                      <span className="text-yellow-600 font-semibold">
                        ~{processedDiff.filter(l => l.type === "modified").length}
                      </span>{" "}
                      modified &nbsp;·&nbsp; {changedCount} changes total
                    </span>
                    <button
                      className="flex items-center gap-0.5 hover:text-gray-100"
                      onClick={() => setShowFullDiff(v => !v)}
                    >
                      {showFullDiff ? <><ChevronUp className="w-3 h-3" />Collapse</> : <><ChevronDown className="w-3 h-3" />Show all</>}
                    </button>
                  </div>

                  <div className="border border-white/10 rounded-lg overflow-hidden max-h-[420px] overflow-y-auto bg-card">
                    {displayDiff.map((line) =>
                      line.type === "ellipsis" ? (
                        <div key={line.key} className="px-4 py-1 text-xs text-gray-400 italic bg-white/5 border-y border-dashed border-white/10">
                          {line.text}
                        </div>
                      ) : line.type === "modified" ? (
                        <ModifiedLine key={line.key} oldText={line.oldText} newText={line.newText} />
                      ) : (
                        <DiffLine key={line.key} type={line.type} text={line.text} />
                      )
                    )}
                  </div>

                  <Button
                    onClick={handleApproveDownload}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                    Approve &amp; Download tailored_resume.docx
                  </Button>

                  <div className="flex justify-center">
                    <button
                      className="text-xs text-gray-400 hover:text-blue-600"
                      onClick={() => { setFlowStep("gap-qa"); setDiffResult(null); }}
                    >
                      ← Edit answers &amp; regenerate
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 text-center">
                    Declining? Simply close this page — nothing is saved.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
