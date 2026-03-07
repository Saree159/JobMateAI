import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { userApi, resumeApi } from "@/api/jobmate";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles, Upload, X, Check,
  ChevronRight, ChevronLeft, Loader2, Globe, Building2, Laptop2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const ROLE_OPTIONS = [
  { label: "Frontend Dev",       icon: "🖥️",  value: "Frontend Developer" },
  { label: "Backend Dev",        icon: "⚙️",  value: "Backend Developer" },
  { label: "Full Stack Dev",     icon: "🔄",  value: "Full Stack Developer" },
  { label: "Data Science / ML",  icon: "📊",  value: "Data Scientist" },
  { label: "Product Manager",    icon: "📦",  value: "Product Manager" },
  { label: "DevOps / Cloud",     icon: "☁️",  value: "DevOps Engineer" },
  { label: "UI/UX Designer",     icon: "🎨",  value: "UI/UX Designer" },
  { label: "QA Engineer",        icon: "🔍",  value: "QA Engineer" },
  { label: "Other",              icon: "✏️",  value: "other" },
];

const EXPERIENCE_LEVELS = [
  { label: "Entry",     sub: "0–1 yr",  value: "entry" },
  { label: "Junior",    sub: "1–3 yrs", value: "junior" },
  { label: "Mid-Level", sub: "3–5 yrs", value: "mid" },
  { label: "Senior",    sub: "5+ yrs",  value: "senior" },
];

const WORK_MODES = [
  { label: "Remote",   icon: <Globe className="w-5 h-5" />,    value: "remote" },
  { label: "Hybrid",   icon: <Laptop2 className="w-5 h-5" />,  value: "hybrid" },
  { label: "On-site",  icon: <Building2 className="w-5 h-5" />, value: "onsite" },
];

const STEPS = ["Career Goals", "Resume & Skills", "Review"];

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser, getToken } = useAuth();
  const fileInputRef = useRef(null);

  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    target_role: "",
    custom_role: "",
    experience_level: "",
    work_mode_preference: "remote",
    skills: [],
  });
  const [skillInput, setSkillInput] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateUserMutation = useMutation({
    mutationFn: (data) => userApi.update(user.id, data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      navigate(createPageUrl("dashboard"));
    },
    onError: () => setError("Failed to save profile. Please try again."),
  });

  const handleAddSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills.includes(skill)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill) =>
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const token = getToken();
      const result = await resumeApi.upload(file, token);
      const extracted = result.parsed_data?.skills || [];
      setFormData((prev) => {
        const existing = new Set(prev.skills);
        const merged = [...prev.skills, ...extracted.filter((s) => !existing.has(s))];
        const detectedRole = result.parsed_data?.target_role;
        return {
          ...prev,
          skills: merged,
          target_role: prev.target_role || detectedRole || prev.target_role,
        };
      });
      setResumeUploaded(true);
    } catch (err) {
      setError(err.message || "Failed to parse resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const role = formData.target_role === "other" ? formData.custom_role : formData.target_role;
      if (!role) { setError("Please select your target role."); return; }
      if (!formData.experience_level) { setError("Please select your experience level."); return; }
    }
    setError("");
    setStep((s) => s + 1);
  };

  const handleComplete = () => {
    const role = formData.target_role === "other" ? formData.custom_role : formData.target_role;
    updateUserMutation.mutate({
      target_role: role,
      skills: formData.skills,
      work_mode_preference: formData.work_mode_preference,
    });
  };

  const resolvedRole =
    formData.target_role === "other" ? formData.custom_role : formData.target_role;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Card className="w-full max-w-2xl border border-gray-100 shadow-xl">
        {/* ── Header ── */}
        <CardHeader className="text-center pb-6 pt-10">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {t('onboarding.title')}
          </CardTitle>
          <CardDescription className="text-base mt-1">
            {t('onboarding.subtitle')}
          </CardDescription>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-0 mt-6">
            {STEPS.map((label, i) => {
              const s = i + 1;
              const active = s === step;
              const done = s < step;
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                        done
                          ? "bg-indigo-600 text-white"
                          : active
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {done ? <Check className="w-4 h-4" /> : s}
                    </div>
                    <span className={cn("text-xs font-medium", active ? "text-indigo-600" : "text-gray-400")}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("w-16 h-0.5 mb-4 transition-all", done ? "bg-indigo-600" : "bg-gray-200")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pb-10 px-8 sm:px-10">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ══════════════════════════════════════════
              STEP 1 — Career Goals
          ══════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">

              {/* Role selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">What kind of role are you looking for?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, target_role: opt.value, custom_role: "" }));
                        setError("");
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all hover:border-indigo-400",
                        formData.target_role === opt.value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600"
                      )}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="text-center leading-tight text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {formData.target_role === "other" && (
                  <Input
                    placeholder="Enter your role title..."
                    value={formData.custom_role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, custom_role: e.target.value }))}
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>

              {/* Experience level */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">What's your experience level?</Label>
                <div className="grid grid-cols-4 gap-2">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, experience_level: lvl.value }));
                        setError("");
                      }}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all hover:border-indigo-400",
                        formData.experience_level === lvl.value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600"
                      )}
                    >
                      <span className="font-semibold text-sm">{lvl.label}</span>
                      <span className="text-xs text-gray-400">{lvl.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Work mode */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Work mode preference</Label>
                <div className="flex gap-3">
                  {WORK_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setFormData((prev) => ({ ...prev, work_mode_preference: mode.value }))}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 text-sm font-medium transition-all hover:border-indigo-400",
                        formData.work_mode_preference === mode.value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600"
                      )}
                    >
                      {mode.icon}
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-base" size="lg">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 2 — Resume & Skills
          ══════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">

              <div>
                <Label className="text-base font-semibold">Upload your resume</Label>
                <p className="text-sm text-gray-500 mt-0.5">
                  We'll automatically extract your skills — PDF or DOCX, up to 5 MB
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                  isDragging ? "border-indigo-600 bg-indigo-50" :
                  resumeUploaded ? "border-green-400 bg-green-50 cursor-default" :
                  "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="font-medium text-indigo-700">Analyzing your resume...</p>
                    <p className="text-sm text-gray-500">Extracting skills and experience</p>
                  </div>
                ) : resumeUploaded ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="font-medium text-green-700">Resume analyzed!</p>
                    <p className="text-sm text-gray-500">Skills extracted and added below</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Drop your resume here or click to browse</p>
                      <p className="text-sm text-gray-400 mt-0.5">PDF or DOCX · Max 5 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Your Skills
                  {formData.skills.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({formData.skills.length} added)
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a skill and press Enter (e.g. Python, React)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                  />
                  <Button onClick={handleAddSkill} variant="outline">Add</Button>
                </div>
                {formData.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[64px]">
                    {formData.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="py-1 px-3 text-sm">
                        {skill}
                        <button onClick={() => handleRemoveSkill(skill)} className="ml-2 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No skills yet — upload your resume or add them manually above.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 py-5" size="lg">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={handleNext} className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-5" size="lg">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 3 — Review
          ══════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <Label className="text-base font-semibold">Review your profile</Label>
                <p className="text-sm text-gray-500 mt-0.5">Everything look good? You can always edit later.</p>
              </div>

              <div className="space-y-0 bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                <ReviewRow label="Target Role" value={resolvedRole || "—"} />
                <ReviewRow
                  label="Experience"
                  value={EXPERIENCE_LEVELS.find((l) => l.value === formData.experience_level)?.label || "—"}
                />
                <ReviewRow label="Work Mode" value={
                  WORK_MODES.find((m) => m.value === formData.work_mode_preference)?.label || "—"
                } />
                <div className="flex justify-between items-start px-5 py-4">
                  <span className="text-sm text-gray-500 mt-0.5">Skills</span>
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[65%]">
                    {formData.skills.length > 0
                      ? formData.skills.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))
                      : <span className="text-gray-400 text-sm">None added</span>
                    }
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 py-5" size="lg">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={updateUserMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-5"
                  size="lg"
                >
                  {updateUserMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Complete Setup</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between items-center px-5 py-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
