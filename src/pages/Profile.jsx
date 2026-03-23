import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { userApi, resumeApi } from "@/api/jobmate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Briefcase, MapPin, DollarSign, X, Save, CheckCircle2, Crown, Upload, FileUp, Loader2, Bell, Mail, Download, Wand2, FileText, Languages, Linkedin, Link, Unlink } from "lucide-react";
import SubscriptionBadge from "../components/subscription/SubscriptionBadge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, getToken, updateUser } = useAuth();
  const { t, i18n } = useTranslation();

  // Helper function to normalize skills to array format
  const normalizeSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [skillInput, setSkillInput] = useState('');
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // LinkedIn login
  const [liEmail, setLiEmail] = useState('');
  const [liPassword, setLiPassword] = useState('');
  const [liAtInput, setLiAtInput] = useState('');
  const [liAtSaving, setLiAtSaving] = useState(false);
  const [showManualCookie, setShowManualCookie] = useState(false);

  // Resume rewriter state
  const [rewriteFile, setRewriteFile] = useState(null);
  const [rewriteJD, setRewriteJD] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('hirematex_lang', lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const currentLang = i18n.language;

  const uploadResumeMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      if (!token) throw new Error('Session expired — please log in again.');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/resume/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload resume');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const updatedUser = { ...user, ...data.user };
      updateUser(updatedUser);
      queryClient.setQueryData(['currentUser'], updatedUser);
      const msg = data.updated_fields.length > 0
        ? `Resume parsed! Updated: ${data.updated_fields.join(', ')}`
        : 'Resume parsed! (no new fields to update)';
      toast.success(msg);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload resume');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleResumeUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      toast.error('Please upload a PDF or DOCX file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    uploadResumeMutation.mutate(file);
  };

  const handleResumeRewrite = async () => {
    // Use saved resume if no file is selected
    let fileToUse = rewriteFile;
    if (!fileToUse && user?.resume_filename) {
      const token2 = getToken();
      if (!token2) { toast.error('Session expired — please log in again.'); return; }
      try {
        fileToUse = await resumeApi.getSavedFile(token2, user.resume_filename);
      } catch {
        toast.error('Could not load saved resume'); return;
      }
    }
    if (!fileToUse) { toast.error('Please upload your resume first'); return; }
    if (!rewriteJD.trim()) { toast.error('Please paste the job description'); return; }

    setIsRewriting(true);
    try {
      const token = getToken();
      if (!token) { toast.error('Session expired — please log in again.'); return; }
      const blob = await resumeApi.rewrite(fileToUse, rewriteJD, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rewritten_resume.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Resume rewritten and downloaded!');
    } catch (err) {
      toast.error(err.message || 'Rewrite failed');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleLinkedInLogin = async () => {
    if (!liEmail.trim() || !liPassword.trim()) return;
    setLiAtSaving(true);
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API}/api/users/${user.id}/linkedin/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: liEmail.trim(), password: liPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Connection failed');
      const updated = await userApi.getById(user.id);
      updateUser(updated);
      queryClient.setQueryData(['currentUser'], updated);
      setLiEmail('');
      setLiPassword('');
      toast.success('LinkedIn connected!');
    } catch (err) {
      toast.error(err.message || 'Failed to connect LinkedIn');
    } finally {
      setLiAtSaving(false);
    }
  };

  const handleSaveLiAt = async () => {
    if (!liAtInput.trim()) return;
    setLiAtSaving(true);
    try {
      const updated = await userApi.update(user.id, { linkedin_li_at: liAtInput.trim() });
      updateUser(updated);
      queryClient.setQueryData(['currentUser'], updated);
      setLiAtInput('');
      toast.success('LinkedIn connected successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save LinkedIn token');
    } finally {
      setLiAtSaving(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    setLiAtSaving(true);
    try {
      const updated = await userApi.update(user.id, { linkedin_li_at: '' });
      updateUser(updated);
      queryClient.setQueryData(['currentUser'], updated);
      toast.success('LinkedIn disconnected');
    } catch (err) {
      toast.error('Failed to disconnect LinkedIn');
    } finally {
      setLiAtSaving(false);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: (data) => userApi.update(user.id, data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.setQueryData(['currentUser'], updatedUser);
      setIsEditing(false);
      setSuccess(true);
      toast.success(t('profile.profileUpdated'));
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const startEditing = () => {
    setFormData({
      target_role: user?.target_role || '',
      years_of_experience: user?.years_of_experience ?? '',
      skills: normalizeSkills(user?.skills),
      location_preference: user?.location_preference || '',
      work_mode_preference: user?.work_mode_preference || '',
      bio: user?.bio || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateUserMutation.mutate({
      target_role: formData.target_role || undefined,
      years_of_experience: formData.years_of_experience !== '' ? parseInt(formData.years_of_experience) : undefined,
      skills: formData.skills,
      location_preference: formData.location_preference || undefined,
      work_mode_preference: formData.work_mode_preference || undefined,
    });
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skillToRemove)
    });
  };

  const currentPlan = user?.subscription_tier || 'free';
  const isPro = currentPlan === 'pro';

  if (!user) {
    return <div className="p-8">{t('common.loading')}</div>;
  }

  return (
    <div className="p-4 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1">
            {t('profile.title')}
          </h1>
          <p className="text-gray-500 text-sm md:text-base">{t('profile.subtitle')}</p>
        </div>
        {!isEditing && (
          <Button onClick={startEditing} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            {t('profile.editProfile')}
          </Button>
        )}
      </div>

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-900/30">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {t('profile.profileUpdated')}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Language Toggle Card */}
        <Card className="border border-white/5">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-600" />
              {t('profile.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">{t('profile.languageSubtitle')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => changeLang('en')}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  currentLang === 'en'
                    ? 'bg-blue-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                English
              </button>
              <button
                onClick={() => changeLang('he')}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  currentLang === 'he'
                    ? 'bg-blue-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                עברית
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className={`border ${isPro ? 'border-blue-500/30 bg-blue-900/30' : 'border-white/5'}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {isPro ? <Crown className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-gray-400" />}
                {t('profile.subscription')}
              </span>
              <SubscriptionBadge tier={currentPlan} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-white">{isPro ? t('pricing.currentPlanPro') : t('pricing.currentPlanFree')}</p>
                <p className="text-sm text-gray-400">
                  {isPro ? 'Unlimited access to all features' : 'Limited to 5 job views per day'}
                </p>
              </div>
              <Button
                variant={isPro ? "outline" : "default"}
                onClick={() => navigate(createPageUrl("Pricing"))}
                className={!isPro ? "bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600" : ""}
              >
                {isPro ? 'Manage Subscription' : t('pricing.upgradeToPro')}
              </Button>
            </div>
            {isPro && user.subscription_end_date && (
              <p className="text-xs text-gray-500">
                Renews on {new Date(user.subscription_end_date).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="border border-white/5">
          <CardHeader>
            <CardTitle className="font-semibold">
              {t('profile.careerInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.targetRole')}</Label>
              {isEditing ? (
                <Input
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  placeholder={t('profile.targetRolePlaceholder')}
                />
              ) : (
                <p className="text-white font-medium">{user.target_role || t('common.notSet')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('profile.yearsOfExperience')}</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.years_of_experience}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                  placeholder="5"
                />
              ) : (
                <p className="text-white font-medium">{user.years_of_experience != null ? `${user.years_of_experience} years` : t('common.notSet')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('profile.professionalSummary')}</Label>
              {isEditing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={t('profile.summaryPlaceholder')}
                  rows={4}
                />
              ) : (
                <p className="text-gray-300">{user.bio || t('common.notSet')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resume Upload */}
        <Card className="border border-white/5">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                {t('profile.uploadResume')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">{t('profile.uploadSubtitle')}</p>

            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleResumeUpload}
                disabled={isUploading}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  className="cursor-pointer"
                  onClick={() => document.getElementById('resume-upload').click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                      {t('profile.parsingResume')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('profile.chooseFile')}
                    </>
                  )}
                </Button>
              </label>
              <span className="text-sm text-gray-500">{t('profile.maxFileSize')}</span>
            </div>

            <Alert className="bg-blue-900/30 border-blue-500/30">
              <AlertDescription className="text-sm text-blue-300">
                💡 {t('profile.resumeTip')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Rewrite Resume for a Job */}
        <Card className="border border-blue-500/20 bg-gradient-to-br from-white to-indigo-50/30">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-blue-600" />
              {t('profile.rewriteResume')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">{t('profile.rewriteSubtitle')}</p>

            {/* Saved resume indicator */}
            {user?.resume_filename && !rewriteFile && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-500/20">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs text-gray-300 flex-1 truncate">{user.resume_filename}</span>
                <span className="text-xs text-blue-400">Will be used</span>
              </div>
            )}

            {/* Active override file */}
            {rewriteFile && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-950/30 border border-green-500/20">
                <FileText className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-xs text-gray-300 flex-1 truncate">{rewriteFile.name}</span>
                <button className="text-xs text-gray-400 hover:text-red-400" onClick={() => setRewriteFile(null)}>✕</button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                id="rewrite-resume-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!f.name.endsWith('.pdf') && !f.name.endsWith('.docx')) {
                    toast.error('Please upload a PDF or DOCX file'); return;
                  }
                  if (f.size > 5 * 1024 * 1024) {
                    toast.error('File size must be less than 5MB'); return;
                  }
                  setRewriteFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('rewrite-resume-input').click()}
              >
                <FileText className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                {user?.resume_filename ? 'Upload different resume' : t('profile.chooseResume')}
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">{t('profile.jobDescription')}</label>
              <Textarea
                placeholder={t('profile.jobDescPlaceholder')}
                rows={6}
                value={rewriteJD}
                onChange={(e) => setRewriteJD(e.target.value)}
                className="text-sm resize-none"
              />
            </div>

            <Button
              onClick={handleResumeRewrite}
              disabled={isRewriting || (!rewriteFile && !user?.resume_filename) || !rewriteJD.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isRewriting ? (
                <><Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />{t('profile.rewriting')}</>
              ) : (
                <><Download className="w-4 h-4 ltr:mr-2 rtl:ml-2" />{t('profile.rewriteDownload')}</>
              )}
            </Button>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-xs text-amber-700">
                {t('profile.rewriteTip')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="border border-white/5">
          <CardHeader>
            <CardTitle className="font-semibold">{t('profile.skills')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && (
              <div className="flex gap-2">
                <Input
                  placeholder={t('profile.addSkillPlaceholder')}
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <Button onClick={handleAddSkill} variant="outline">{t('profile.addSkill')}</Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(isEditing ? formData.skills : normalizeSkills(user?.skills)).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ltr:ml-2 rtl:mr-2 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {normalizeSkills(user?.skills).length === 0 && !isEditing && (
                <p className="text-gray-500">{t('profile.noSkills')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border border-white/5">
          <CardHeader>
            <CardTitle className="font-semibold">
              {t('profile.preferences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.locationPref')}</Label>
              {isEditing ? (
                <Input
                  value={formData.location_preference}
                  onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                  placeholder={t('profile.locationPlaceholder')}
                />
              ) : (
                <p className="text-white font-medium">{user.location_preference || t('common.notSet')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('profile.minSalary')}</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    placeholder="10000"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {user.salary_min ? `₪${user.salary_min.toLocaleString()}` : t('common.notSet')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('profile.maxSalary')}</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    placeholder="20000"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {user.salary_max ? `₪${user.salary_max.toLocaleString()}` : t('common.notSet')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn Integration */}
        <Card className={`border ${user.linkedin_connected ? 'border-blue-500/30 bg-blue-950/20' : 'border-white/5'}`}>
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-blue-500" />
              LinkedIn Integration
              {user.linkedin_connected && (
                <span className="ml-auto text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Link className="w-3 h-3" /> Connected
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.linkedin_connected ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Your LinkedIn session is active. Job searches and descriptions will use your account for authenticated access.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={handleDisconnectLinkedIn}
                  disabled={liAtSaving}
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  {liAtSaving ? 'Disconnecting…' : 'Disconnect LinkedIn'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Sign in with your LinkedIn credentials to unlock real job listings and full descriptions. Your credentials are used once to obtain a session token and are never stored.
                </p>

                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="LinkedIn email"
                    value={liEmail}
                    onChange={(e) => setLiEmail(e.target.value)}
                    disabled={liAtSaving}
                  />
                  <Input
                    type="password"
                    placeholder="LinkedIn password"
                    value={liPassword}
                    onChange={(e) => setLiPassword(e.target.value)}
                    disabled={liAtSaving}
                    onKeyDown={(e) => e.key === 'Enter' && handleLinkedInLogin()}
                  />
                  <Button
                    onClick={handleLinkedInLogin}
                    disabled={liAtSaving || !liEmail.trim() || !liPassword.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {liAtSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting…</>
                    ) : (
                      <><Linkedin className="w-4 h-4 mr-2" />Connect LinkedIn</>
                    )}
                  </Button>
                </div>

                <details className="group" open={showManualCookie} onToggle={(e) => setShowManualCookie(e.target.open)}>
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 select-none">
                    Have 2FA enabled? Paste your session cookie manually instead
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500">
                      Open linkedin.com → F12 → Application → Cookies → copy <code className="text-blue-400">li_at</code> value
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Paste li_at cookie value…"
                        value={liAtInput}
                        onChange={(e) => setLiAtInput(e.target.value)}
                        className="font-mono text-xs"
                        disabled={liAtSaving}
                      />
                      <Button
                        onClick={handleSaveLiAt}
                        disabled={liAtSaving || !liAtInput.trim()}
                        variant="outline"
                        className="shrink-0"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card className="border border-white/5">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              {t('profile.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">{t('profile.notificationsSubtitle')}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">{t('profile.interviewReminders')}</p>
                  <p className="text-sm text-gray-500">{t('profile.interviewRemindersDesc')}</p>
                </div>
                <div className="text-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">{t('profile.followUpReminders')}</p>
                  <p className="text-sm text-gray-500">{t('profile.followUpRemindersDesc')}</p>
                </div>
                <div className="text-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">{t('profile.deadlineAlerts')}</p>
                  <p className="text-sm text-gray-500">{t('profile.deadlineAlertsDesc')}</p>
                </div>
                <div className="text-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            <Alert className="bg-blue-900/30 border-blue-500/30">
              <AlertDescription className="text-sm text-blue-300">
                💡 Configure SMTP settings in backend to enable email notifications
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {updateUserMutation.isPending ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
