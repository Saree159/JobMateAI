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
// ---------------------------------------------------------------------------
function charDiff(oldStr, newStr) {
  let i = 0;
  while (i < oldStr.length && i < newStr.length && oldStr[i] === newStr[i]) i++;
  const prefix = oldStr.slice(0, i);
  let oldEnd = oldStr.length, newEnd = newStr.length;
  while (oldEnd > i && newEnd > i && oldStr[oldEnd - 1] === newStr[newEnd - 1]) { oldEnd--; newEnd--; }
  return { prefix, removed: oldStr.slice(i, oldEnd), added: newStr.slice(i, newEnd), suffix: oldStr.slice(oldEnd) };
}

function areSimilar(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let aEnd = a.length, bEnd = b.length;
  while (aEnd > i && bEnd > i && a[aEnd - 1] === b[bEnd - 1]) { aEnd--; bEnd--; }
  return (i + (a.length - aEnd)) / Math.max(a.length, b.length, 1) > 0.5;
}

function processInlineDiff(rawLines) {
  const result = [];
  let i = 0;
  while (i < rawLines.length) {
    const l = rawLines[i];
    if (l.type === "removed" && i + 1 < rawLines.length && rawLines[i + 1].type === "added" && areSimilar(l.text, rawLines[i + 1].text)) {
      result.push({ type: "modified", oldText: l.text, newText: rawLines[i + 1].text });
      i += 2;
    } else {
      result.push(l);
      i++;
    }
  }
  return result;
}

const CONTEXT_WINDOW = 2;
function collapseContext(diffLines) {
  const changed = new Set();
  diffLines.forEach((l, i) => {
    if (l.type !== "context" && l.type !== "ellipsis") {
      for (let j = Math.max(0, i - CONTEXT_WINDOW); j <= Math.min(diffLines.length - 1, i + CONTEXT_WINDOW); j++) changed.add(j);
    }
  });
  const result = [];
  let skipped = 0;
  diffLines.forEach((l, i) => {
    if (changed.has(i)) {
      if (skipped > 0) { result.push({ type: "ellipsis", text: `··· ${skipped} unchanged lines ···`, key: `skip-${i}` }); skipped = 0; }
      result.push({ ...l, key: i });
    } else { skipped++; }
  });
  if (skipped > 0) result.push({ type: "ellipsis", text: `··· ${skipped} unchanged lines ···`, key: "skip-end" });
  return result;
}

// ---------------------------------------------------------------------------
// Diff renderers
// ---------------------------------------------------------------------------
function DiffLine({ type, text }) {
  if (type === "added")   return <div className="flex gap-2 bg-green-50 border-l-2 border-green-500 px-3 py-0.5"><span className="select-none text-green-600 font-bold font-mono text-xs w-3 shrink-0">+</span><span className="font-mono text-xs text-green-700 break-all">{text}</span></div>;
  if (type === "removed") return <div className="flex gap-2 bg-red-50 border-l-2 border-red-500 px-3 py-0.5 opacity-80"><span className="select-none text-red-500 font-bold font-mono text-xs w-3 shrink-0">−</span><span className="font-mono text-xs text-red-600 line-through break-all">{text}</span></div>;
  return <div className="flex gap-2 px-3 py-0.5"><span className="w-3 shrink-0" /><span className="font-mono text-xs text-gray-500 break-all">{text}</span></div>;
}

function ModifiedLine({ oldText, newText }) {
  const { prefix, removed, added, suffix } = charDiff(oldText, newText);
  return (
    <div className="flex gap-2 bg-yellow-50 border-l-2 border-yellow-500 px-3 py-0.5">
      <span className="select-none text-yellow-600 font-bold font-mono text-xs w-3 shrink-0">~</span>
      <span className="font-mono text-xs break-all">
        <span className="text-gray-600">{prefix}</span>
        {removed && <span className="bg-red-100 text-red-600 line-through">{removed}</span>}
        {added   && <span className="bg-green-100 text-green-700">{added}</span>}
        <span className="text-gray-600">{suffix}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score badge — compact on mobile
// ---------------------------------------------------------------------------
function ScoreBadge({ score }) {
  const color =
    score >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
    score >= 40 ? "text-amber-700   bg-amber-50   border-amber-200"   :
                  "text-gray-500    bg-gray-50     border-gray-200";
  return (
    <div className={`flex flex-col items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl border-2 shrink-0 ${color}`}>
      <span className="text-lg md:text-2xl font-bold leading-none tabular-nums">{score}%</span>
      <span className="text-[9px] md:text-[10px] mt-0.5 font-medium opacity-70">match</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function JobMatch() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { user, getToken } = useAuth();
  const job = state?.job;

  const [fullDescription, setFullDescription]   = useState(null);
  const [isFetchingDesc, setIsFetchingDesc]     = useState(false);
  const [descBlocked, setDescBlocked]           = useState(false);
  const [resumeFile, setResumeFile]             = useState(null);
  const [usingSavedResume, setUsingSavedResume] = useState(false);
  const [showFullDesc, setShowFullDesc]         = useState(false);
  const [flowStep, setFlowStep]                 = useState("idle");
  const [gapAnalysis, setGapAnalysis]           = useState(null);
  const [gapAnswers, setGapAnswers]             = useState({});
  const [diffResult, setDiffResult]             = useState(null);
  const [showFullDiff, setShowFullDiff]         = useState(false);

  useEffect(() => {
    if (!job?.url) return;
    setIsFetchingDesc(true);
    setDescBlocked(false);
    jobsApi.fetchDescription(job.url, user?.id)
      .then(data => setFullDescription(data.description))
      .catch(err => { if (err?.status === 403 || err?.message?.includes('403')) setDescBlocked(true); })
      .finally(() => setIsFetchingDesc(false));
  }, [job?.url]);

  const matchAnalysis = useMemo(() => {
    const userSkills = (user?.skills || []).map(s => typeof s === "string" ? s.toLowerCase() : "").filter(Boolean);
    const descText   = (fullDescription || job?.description || job?.title || "").toLowerCase();
    const jobTagSkills = job?.skills || [];
    const matched = userSkills.filter(s => jobTagSkills.some(t => t.toLowerCase() === s) || descText.includes(s));
    const missing = jobTagSkills.filter(s => !userSkills.includes(s.toLowerCase()));
    return { matched, missing };
  }, [user, job, fullDescription]);

  const processedDiff = useMemo(() => diffResult ? processInlineDiff(diffResult.diff) : [], [diffResult]);

  if (!job) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500 mb-4">No job data found.</p>
        <Button onClick={() => navigate(createPageUrl("Dashboard"))}>Back to Dashboard</Button>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const resetFlow = () => { setResumeFile(null); setUsingSavedResume(false); setDiffResult(null); setGapAnalysis(null); setGapAnswers({}); setFlowStep("idle"); };

  const handleUseSavedResume = async () => {
    const token = getToken();
    if (!token) { toast.error("Session expired — please log in again."); return; }
    try {
      const file = await resumeApi.getSavedFile(token, user.resume_filename);
      setResumeFile(file); setUsingSavedResume(true);
      setDiffResult(null); setGapAnalysis(null); setGapAnswers({}); setFlowStep("idle");
    } catch { toast.error("Could not load saved resume"); }
  };

  const handleAnalyzeGaps = async () => {
    if (!resumeFile) { toast.error("Please upload your resume first"); return; }
    const token = getToken();
    if (!token) { toast.error("Session expired — please log in again."); return; }
    setFlowStep("analyzing-gaps"); setGapAnalysis(null); setGapAnswers({}); setDiffResult(null);
    try {
      const jd = fullDescription || job.description || job.title;
      setGapAnalysis(await resumeApi.analyzeGaps(resumeFile, jd, token));
      setFlowStep("gap-qa");
    } catch (err) { toast.error(err.message || "Gap analysis failed"); setFlowStep("idle"); }
  };

  const handleGenerateDiff = async () => {
    const token = getToken();
    if (!token) { toast.error("Session expired — please log in again."); return; }
    setFlowStep("rewriting"); setDiffResult(null);
    try {
      const jd = fullDescription || job.description || job.title;
      const extraContext = (gapAnalysis?.gaps || []).map((gap, i) => { const ans = (gapAnswers[i] || "").trim(); return ans ? `${gap.requirement}: ${ans}` : null; }).filter(Boolean).join("\n");
      setDiffResult(await resumeApi.rewriteDiff(resumeFile, jd, token, extraContext));
      setFlowStep("done");
      toast.success("Done — review your changes below");
    } catch (err) { toast.error(err.message || "Analysis failed"); setFlowStep("gap-qa"); }
  };

  const handleApproveDownload = () => {
    if (!diffResult?.docx_b64) return;
    const blob = new Blob([Uint8Array.from(atob(diffResult.docx_b64), c => c.charCodeAt(0))], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "tailored_resume.docx" });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Resume downloaded!");
  };

  const collapsedDiff   = diffResult ? collapseContext(processedDiff).map((l, i) => ({ ...l, key: l.key ?? i })) : [];
  const displayDiff     = showFullDiff ? processedDiff.map((l, i) => ({ ...l, key: i })) : collapsedDiff;
  const changedCount    = processedDiff.filter(l => l.type !== "context").length;

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden w-full">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors py-1 -ml-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* ── Job Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex gap-3 md:gap-5 items-center">
          <ScoreBadge score={job.match_score ?? 0} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight break-words">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-gray-500 mt-1">
              {job.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />{job.company}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />{job.location}
                </span>
              )}
              {job.experience_level && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-gray-200 text-gray-500">
                  {job.experience_level}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="block mt-3">
            <Button size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
              Apply Now <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </a>
        )}
      </div>

      {/* ── Two-column grid — Resume first on mobile ───────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">

        {/* ── RIGHT (Resume) — comes first on mobile via order ─────────── */}
        <div className="order-first lg:order-last min-w-0">
          <Card className="border border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Tailor Resume for This Job
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                We'll identify gaps, ask a few questions, then rewrite your resume for this role.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Step 0: Resume source */}
              <div>
                {user?.resume_filename ? (
                  resumeFile ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-gray-700 flex-1 truncate">{resumeFile.name}</span>
                      {flowStep === "idle" && (
                        <button className="text-xs text-gray-500 hover:text-red-400 transition-colors shrink-0" onClick={resetFlow}>✕</button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs text-gray-700 flex-1 truncate min-w-0">{user.resume_filename}</span>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 shrink-0"
                        onClick={handleUseSavedResume}
                        disabled={flowStep === "analyzing-gaps" || flowStep === "rewriting"}
                      >
                        Use resume
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs text-gray-700">No resume saved yet</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0 w-full sm:w-auto"
                      onClick={() => navigate(createPageUrl("Profile"))}
                    >
                      Upload on Profile
                    </Button>
                  </div>
                )}
              </div>

              {/* Step 1: Analyze Gaps */}
              {flowStep === "idle" && (
                <Button
                  onClick={handleAnalyzeGaps}
                  disabled={!resumeFile}
                  className="w-full bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
                  size="sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Check Resume Gaps
                </Button>
              )}

              {/* Loading: gap analysis */}
              {flowStep === "analyzing-gaps" && (
                <div className="flex items-center gap-2.5 text-sm text-blue-600 py-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="text-xs">Analysing your resume against job requirements…</span>
                </div>
              )}

              {/* Step 2: Gap Q&A */}
              {flowStep === "gap-qa" && gapAnalysis && (
                <div className="space-y-4">
                  {/* Summary — dark-safe */}
                  <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">{gapAnalysis.summary}</p>
                  </div>

                  {gapAnalysis.gaps.length === 0 ? (
                    <p className="text-sm text-emerald-400 font-medium">
                      Great — no significant gaps! Strong match.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        Answer below to strengthen your resume (all optional):
                      </p>
                      <div className="space-y-4">
                        {gapAnalysis.gaps.map((gap, i) => (
                          <div key={i} className="space-y-1.5">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                              {gap.requirement}
                            </span>
                            <p className="text-xs text-gray-400">{gap.question}</p>
                            <Textarea
                              rows={2}
                              placeholder="Your answer (optional)…"
                              className="text-xs resize-none bg-gray-50 border-gray-200 focus:border-blue-500/50"
                              value={gapAnswers[i] || ""}
                              onChange={(e) => setGapAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleGenerateDiff} className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm">
                      <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                      Generate Tailored Resume
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-300 shrink-0"
                      onClick={() => { setFlowStep("idle"); setGapAnalysis(null); setGapAnswers({}); }}>
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading: rewriting */}
              {flowStep === "rewriting" && (
                <div className="flex items-center gap-2.5 text-sm text-blue-600 py-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="text-xs">Rewriting resume (~20s)…</span>
                </div>
              )}

              {/* Step 3: Diff viewer */}
              {flowStep === "done" && diffResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 flex-wrap gap-1">
                    <span className="tabular-nums">
                      <span className="text-emerald-400 font-semibold">+{processedDiff.filter(l => l.type === "added").length}</span>{" "}
                      <span className="text-red-400 font-semibold">−{processedDiff.filter(l => l.type === "removed").length}</span>{" "}
                      <span className="text-yellow-400 font-semibold">~{processedDiff.filter(l => l.type === "modified").length}</span>{" "}
                      · {changedCount} changes
                    </span>
                    <button className="flex items-center gap-0.5 hover:text-gray-200 transition-colors" onClick={() => setShowFullDiff(v => !v)}>
                      {showFullDiff ? <><ChevronUp className="w-3 h-3" />Collapse</> : <><ChevronDown className="w-3 h-3" />Show all</>}
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[280px] md:max-h-[400px] overflow-y-auto overflow-x-hidden bg-gray-50 w-full">
                    {displayDiff.map(line =>
                      line.type === "ellipsis" ? (
                        <div key={line.key} className="px-4 py-1 text-xs text-gray-400 italic bg-gray-100/50 border-y border-dashed border-gray-200">
                          {line.text}
                        </div>
                      ) : line.type === "modified" ? (
                        <ModifiedLine key={line.key} oldText={line.oldText} newText={line.newText} />
                      ) : (
                        <DiffLine key={line.key} type={line.type} text={line.text} />
                      )
                    )}
                  </div>

                  <Button onClick={handleApproveDownload} className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    <span className="hidden sm:inline">Approve &amp; Download</span>
                    <span className="sm:hidden">Download Resume</span>
                  </Button>

                  <button
                    className="block w-full text-center text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    onClick={() => { setFlowStep("gap-qa"); setDiffResult(null); }}
                  >
                    ← Edit answers &amp; regenerate
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── LEFT (Analysis + Description) — second on mobile ──────────── */}
        <div className="order-last lg:order-first space-y-4 md:space-y-6 min-w-0">

          {/* Match Analysis */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Match Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Overall match</span>
                  <span className="font-semibold tabular-nums">{job.match_score ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (job.match_score ?? 0) >= 70 ? "bg-emerald-500" :
                      (job.match_score ?? 0) >= 40 ? "bg-amber-500" : "bg-gray-500"
                    }`}
                    style={{ width: `${job.match_score ?? 0}%` }}
                  />
                </div>
              </div>

              {matchAnalysis.matched.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-600 mb-1.5">
                    ✓ Your skills matched ({matchAnalysis.matched.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchAnalysis.matched.map((s, i) => (
                      <Badge key={i} className="text-[10px] h-5 px-1.5 font-normal bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
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
                      <Badge key={i} variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-gray-200 text-gray-500">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {matchAnalysis.matched.length === 0 && matchAnalysis.missing.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">No skill tags available for this job</p>
              )}
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Job Description</CardTitle>
                {!isFetchingDesc && (() => {
                  const desc = fullDescription || job.description || "";
                  return desc.length > 600 ? (
                    <button className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-normal" onClick={() => setShowFullDesc(v => !v)}>
                      {showFullDesc ? "Show less" : "Show full"}
                    </button>
                  ) : null;
                })()}
              </div>
            </CardHeader>
            <CardContent>
              {isFetchingDesc ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3,4,5].map(i => <div key={i} className={`h-3 bg-gray-200 rounded ${i === 5 ? "w-2/3" : "w-full"}`} />)}
                </div>
              ) : descBlocked ? (
                <div className="text-xs text-gray-400 py-2 space-y-3">
                  <p>LinkedIn requires login to view the full description.{" "}
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View on LinkedIn</a>}
                  </p>
                  {job.description && <p className="whitespace-pre-line text-gray-500">{job.description}</p>}
                </div>
              ) : (() => {
                const desc = fullDescription || job.description || "";
                const PREVIEW = 600;
                const displayed = desc.length > PREVIEW && !showFullDesc ? desc.slice(0, PREVIEW) + "…" : desc;
                return desc
                  ? <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed break-words">{displayed}</p>
                  : <p className="text-sm text-gray-400 italic">No description available.</p>;
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
