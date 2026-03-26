import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { userApi, resumeApi } from "@/api/jobmate";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload, X, Check, ChevronRight, ChevronLeft, Loader2,
  Globe, Building2, Laptop2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { label: "Frontend Dev",      icon: "🖥️",  value: "Frontend Developer" },
  { label: "Backend Dev",       icon: "⚙️",  value: "Backend Developer" },
  { label: "Full Stack Dev",    icon: "🔄",  value: "Full Stack Developer" },
  { label: "Data Science / ML", icon: "📊",  value: "Data Scientist" },
  { label: "Product Manager",   icon: "📦",  value: "Product Manager" },
  { label: "DevOps / Cloud",    icon: "☁️",  value: "DevOps Engineer" },
  { label: "UI/UX Designer",    icon: "🎨",  value: "UI/UX Designer" },
  { label: "QA Engineer",       icon: "🔍",  value: "QA Engineer" },
  { label: "Other",             icon: "✏️",  value: "other" },
];

const EXPERIENCE_LEVELS = [
  { label: "Entry Level", icon: "🌱", sub: "0–1 yr",   value: "entry" },
  { label: "Junior",      icon: "🚀", sub: "1–3 yrs",  value: "junior" },
  { label: "Mid-Level",   icon: "💼", sub: "3–5 yrs",  value: "mid" },
  { label: "Senior",      icon: "🏆", sub: "5+ yrs",   value: "senior" },
];

const SALARY_OPTIONS = [
  { label: "Under ₪8,000",      value: 0 },
  { label: "₪8,000 – ₪12,000",  value: 8000 },
  { label: "₪12,000 – ₪18,000", value: 12000 },
  { label: "₪18,000 – ₪25,000", value: 18000 },
  { label: "₪25,000 – ₪35,000", value: 25000 },
  { label: "₪35,000+",          value: 35000 },
];

const INDUSTRY_OPTIONS = [
  { label: "Tech & Software",          icon: "💻" },
  { label: "Finance & Fintech",        icon: "🏦" },
  { label: "Healthcare & MedTech",     icon: "🏥" },
  { label: "Education & EdTech",       icon: "🎓" },
  { label: "E-commerce & Retail",      icon: "🛒" },
  { label: "Manufacturing & Industry", icon: "🏭" },
  { label: "Media & Marketing",        icon: "📱" },
  { label: "Other",                    icon: "🌐" },
];

const JOB_TYPE_OPTIONS = [
  { label: "Full-Time",  icon: "💼", value: "full-time" },
  { label: "Part-Time",  icon: "⏰", value: "part-time" },
  { label: "Contract",   icon: "📋", value: "contract" },
  { label: "Freelance",  icon: "💻", value: "freelance" },
  { label: "Internship", icon: "🎓", value: "internship" },
  { label: "Any",        icon: "🔄", value: "any" },
];

const AVAILABILITY_OPTIONS = [
  { label: "Immediately",    icon: "⚡", value: "immediately" },
  { label: "Within 2 weeks", icon: "📅", value: "2-weeks" },
  { label: "Within 1 month", icon: "🗓️", value: "1-month" },
  { label: "3+ months",      icon: "⏳", value: "3-months" },
];

const WORK_MODES = [
  { label: "Remote",  icon: <Globe className="w-4 h-4" />,     value: "remote" },
  { label: "Hybrid",  icon: <Laptop2 className="w-4 h-4" />,   value: "hybrid" },
  { label: "On-site", icon: <Building2 className="w-4 h-4" />, value: "onsite" },
];

const TOTAL_STEPS = 8;

// ─── Animation variants ───────────────────────────────────────────────────────

const variants = {
  enter:  (dir) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

function expLevelToYears(level) {
  return { entry: 0, junior: 1, mid: 3, senior: 5 }[level] ?? 0;
}

// ─── Option card ─────────────────────────────────────────────────────────────

function OptionCard({ selected, onClick, children, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer",
        selected
          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
          : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50",
        className
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center shadow">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser, getToken } = useAuth();
  const fileInputRef = useRef(null);

  const [step, setStep]           = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData]   = useState({
    target_role: "",
    custom_role: "",
    experience_level: "",
    min_salary_preference: null,
    industry_preference: "",
    job_type_preference: [],
    availability: "",
    work_mode_preference: "remote",
    location_preference: "",
    skills: [],
  });
  const [skillInput, setSkillInput]       = useState("");
  const [error, setError]                 = useState("");
  const [isUploading, setIsUploading]     = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [isDragging, setIsDragging]       = useState(false);

  const updateUserMutation = useMutation({
    mutationFn: (data) => userApi.update(user.id, data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      navigate(createPageUrl("dashboard"));
    },
    onError: () => setError("Failed to save profile. Please try again."),
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goNext = () => { setDirection(1);  setStep((s) => Math.min(s + 1, TOTAL_STEPS)); setError(""); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 1));           setError(""); };

  const autoAdvance = (nextData) => {
    setFormData(nextData);
    setTimeout(() => goNext(), 260);
  };

  // ── Skills ──────────────────────────────────────────────────────────────────

  const handleAddSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills.includes(skill)) {
      setFormData((p) => ({ ...p, skills: [...p.skills, skill] }));
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill) =>
    setFormData((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));

  // ── Resume ──────────────────────────────────────────────────────────────────

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    setIsUploading(true); setError("");
    try {
      const result = await resumeApi.upload(file, getToken());
      const extracted = result.parsed_data?.skills || [];
      setFormData((p) => {
        const existing = new Set(p.skills);
        return {
          ...p,
          skills: [...p.skills, ...extracted.filter((s) => !existing.has(s))],
          target_role: p.target_role || result.parsed_data?.target_role || p.target_role,
        };
      });
      setResumeUploaded(true);
    } catch (err) {
      setError(err.message || "Failed to parse resume.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Job type toggle ─────────────────────────────────────────────────────────

  const toggleJobType = (value) =>
    setFormData((p) => ({
      ...p,
      job_type_preference: p.job_type_preference.includes(value)
        ? p.job_type_preference.filter((v) => v !== value)
        : [...p.job_type_preference, value],
    }));

  // ── Complete ─────────────────────────────────────────────────────────────────

  const handleComplete = () => {
    const role = formData.target_role === "other" ? formData.custom_role : formData.target_role;
    updateUserMutation.mutate({
      target_role: role,
      skills: formData.skills,
      work_mode_preference: formData.work_mode_preference,
      location_preference: formData.location_preference,
      min_salary_preference: formData.min_salary_preference,
      industry_preference: formData.industry_preference,
      job_type_preference: formData.job_type_preference.join(","),
      availability: formData.availability,
      years_of_experience: expLevelToYears(formData.experience_level),
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col">

      {/* ── Top bar ── */}
      <div className="fixed top-0 inset-x-0 z-30">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-blue-600"
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </div>
        {/* Nav row */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#F6F6F6]/90 backdrop-blur-sm">
          <button
            onClick={goBack}
            disabled={step === 1}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-0 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {/* Brand */}
          <span className="text-base font-extrabold tracking-tight text-gray-900">HireMatrix</span>

          {/* Step counter */}
          <span className="text-sm font-semibold text-gray-400">
            {step} <span className="text-gray-300">/</span> {TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-lg">

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* ── Step 1: Role ──────────────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-6">
                  <Question title="What role are you targeting?" />
                  <div className="grid grid-cols-3 gap-2.5">
                    {ROLE_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={formData.target_role === opt.value}
                        onClick={() => {
                          if (opt.value !== "other") {
                            autoAdvance({ ...formData, target_role: opt.value, custom_role: "" });
                          } else {
                            setFormData((p) => ({ ...p, target_role: "other" }));
                          }
                        }}
                        className="py-4"
                      >
                        <span className="text-2xl leading-none">{opt.icon}</span>
                        <span className="text-center leading-tight text-xs mt-0.5">{opt.label}</span>
                      </OptionCard>
                    ))}
                  </div>
                  {formData.target_role === "other" && (
                    <div className="space-y-3">
                      <Input
                        placeholder="Enter your role title..."
                        value={formData.custom_role}
                        onChange={(e) => setFormData((p) => ({ ...p, custom_role: e.target.value }))}
                        className="h-12 rounded-xl text-base"
                        autoFocus
                      />
                      <ContinueButton
                        onClick={() => {
                          if (!formData.custom_role.trim()) { setError("Please enter your role."); return; }
                          goNext();
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Experience ────────────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-6">
                  <Question title="What's your target experience level in this role?" />
                  <div className="grid grid-cols-2 gap-3">
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <OptionCard
                        key={lvl.value}
                        selected={formData.experience_level === lvl.value}
                        onClick={() => autoAdvance({ ...formData, experience_level: lvl.value })}
                        className="py-6 gap-2"
                      >
                        <span className="text-3xl leading-none">{lvl.icon}</span>
                        <span className="font-bold text-sm">{lvl.label}</span>
                        <span className="text-xs text-gray-400 font-normal">{lvl.sub}</span>
                      </OptionCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 3: Salary ────────────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6">
                  <Question title="What's your minimum preferred salary?" subtitle="Monthly, in ₪ (ILS)" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {SALARY_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={formData.min_salary_preference === opt.value}
                        onClick={() => autoAdvance({ ...formData, min_salary_preference: opt.value })}
                        className="py-5"
                      >
                        <span className="font-bold text-sm text-center">{opt.label}</span>
                      </OptionCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 4: Industry ──────────────────────────────────────────── */}
              {step === 4 && (
                <div className="space-y-6">
                  <Question title="Which industry excites you most?" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.label}
                        selected={formData.industry_preference === opt.label}
                        onClick={() => autoAdvance({ ...formData, industry_preference: opt.label })}
                        className="flex-row justify-start gap-3 px-5 py-4"
                      >
                        <span className="text-xl flex-shrink-0">{opt.icon}</span>
                        <span className="text-sm font-semibold text-left leading-tight">{opt.label}</span>
                      </OptionCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 5: Work Type ─────────────────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-6">
                  <Question title="What type of work are you open to?" subtitle="Select all that apply" />
                  <div className="flex flex-wrap gap-2.5">
                    {JOB_TYPE_OPTIONS.map((opt) => {
                      const sel = formData.job_type_preference.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleJobType(opt.value)}
                          className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all duration-150",
                            sel
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                              : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50"
                          )}
                        >
                          <span>{opt.icon}</span>
                          {opt.label}
                          {sel && <Check className="w-3 h-3" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                  <ContinueButton
                    onClick={() => {
                      if (formData.job_type_preference.length === 0) {
                        setError("Please select at least one work type.");
                        return;
                      }
                      goNext();
                    }}
                  />
                </div>
              )}

              {/* ── Step 6: Availability ──────────────────────────────────────── */}
              {step === 6 && (
                <div className="space-y-6">
                  <Question title="When are you available to start?" />
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={formData.availability === opt.value}
                        onClick={() => autoAdvance({ ...formData, availability: opt.value })}
                        className="py-6 gap-2"
                      >
                        <span className="text-3xl leading-none">{opt.icon}</span>
                        <span className="font-bold text-sm text-center">{opt.label}</span>
                      </OptionCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 7: Location ──────────────────────────────────────────── */}
              {step === 7 && (
                <div className="space-y-6">
                  <Question title="Where would you like to work?" />
                  <div className="flex gap-2">
                    {WORK_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setFormData((p) => ({ ...p, work_mode_preference: mode.value }))}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all duration-150",
                          formData.work_mode_preference === mode.value
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50"
                        )}
                      >
                        {mode.icon}
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500 font-medium">Preferred city or region</label>
                    <Input
                      placeholder="e.g. Tel Aviv, Berlin, Remote"
                      value={formData.location_preference}
                      onChange={(e) => setFormData((p) => ({ ...p, location_preference: e.target.value }))}
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                  <ContinueButton onClick={goNext} />
                </div>
              )}

              {/* ── Step 8: Skills & Resume ───────────────────────────────────── */}
              {step === 8 && (
                <div className="space-y-5">
                  <Question
                    title="What are your top skills?"
                    subtitle="Upload your resume to auto-extract, or add them manually"
                  />

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files[0]); }}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                      isDragging      ? "border-blue-500 bg-blue-50"
                      : resumeUploaded ? "border-green-400 bg-green-50 cursor-default"
                      : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40"
                    )}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-sm font-semibold text-blue-600">Analyzing your resume…</p>
                      </div>
                    ) : resumeUploaded ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                        </div>
                        <p className="text-sm font-semibold text-green-700">Resume analyzed — skills extracted!</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Drop your resume or click to browse</p>
                        <p className="text-xs text-gray-400">PDF or DOCX · Max 5 MB</p>
                      </div>
                    )}
                  </div>

                  {/* Skill input */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill and press Enter (e.g. Python, React)"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                        className="h-11 rounded-xl"
                      />
                      <Button onClick={handleAddSkill} variant="outline" className="rounded-xl h-11 px-4">Add</Button>
                    </div>
                    {formData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-3 bg-white border border-gray-200 rounded-xl min-h-[52px]">
                        {formData.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="py-1 px-2.5 text-sm rounded-full">
                            {skill}
                            <button onClick={() => handleRemoveSkill(skill)} className="ml-1.5 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">
                        No skills yet — upload your resume or add them above.
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleComplete}
                    disabled={updateUserMutation.isPending}
                    className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-base font-bold tracking-wide shadow-lg shadow-blue-200 transition-all"
                  >
                    {updateUserMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                    ) : (
                      <>Find My Matches <ChevronRight className="w-5 h-5 ml-1" /></>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Question({ title, subtitle }) {
  return (
    <div className="space-y-1.5 mb-1">
      <h2 className="text-[1.65rem] font-extrabold text-gray-900 leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-gray-500 font-medium">{subtitle}</p>}
    </div>
  );
}

function ContinueButton({ onClick, label = "Continue" }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-base font-bold tracking-wide shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
    >
      {label} <ChevronRight className="w-5 h-5" />
    </button>
  );
}
