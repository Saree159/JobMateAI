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
import { User, Briefcase, MapPin, DollarSign, X, Save, CheckCircle2, Crown, Upload, FileUp, Loader2, Bell, Mail, Download, Wand2, FileText, Languages } from "lucide-react";
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

      const response = await fetch('http://localhost:8000/api/resume/upload', {
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
    if (!rewriteFile) { toast.error('Please upload your resume first'); return; }
    if (!rewriteJD.trim()) { toast.error('Please paste the job description'); return; }

    setIsRewriting(true);
    try {
      const token = getToken();
      if (!token) { toast.error('Session expired — please log in again.'); return; }
      const blob = await resumeApi.rewrite(rewriteFile, rewriteJD, token);
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
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-gray-500">{t('profile.subtitle')}</p>
        </div>
        {!isEditing && (
          <Button onClick={startEditing} className="bg-indigo-600 hover:bg-indigo-700">
            {t('profile.editProfile')}
          </Button>
        )}
      </div>

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {t('profile.profileUpdated')}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Language Toggle Card */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Languages className="w-5 h-5 text-indigo-600" />
              {t('profile.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{t('profile.languageSubtitle')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => changeLang('en')}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  currentLang === 'en'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => changeLang('he')}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  currentLang === 'he'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                עברית
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className={`border ${isPro ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {isPro ? <Crown className="w-5 h-5 text-indigo-600" /> : <User className="w-5 h-5 text-gray-600" />}
                {t('profile.subscription')}
              </span>
              <SubscriptionBadge tier={currentPlan} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{isPro ? t('pricing.currentPlanPro') : t('pricing.currentPlanFree')}</p>
                <p className="text-sm text-gray-600">
                  {isPro ? 'Unlimited access to all features' : 'Limited to 5 job views per day'}
                </p>
              </div>
              <Button
                variant={isPro ? "outline" : "default"}
                onClick={() => navigate(createPageUrl("Pricing"))}
                className={!isPro ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" : ""}
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
        <Card className="border border-gray-100">
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
                <p className="text-gray-900 font-medium">{user.target_role || t('common.notSet')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('profile.yearsOfExperience')}</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  placeholder="5"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user.experience_years || t('common.notSet')}</p>
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
                <p className="text-gray-700">{user.bio || t('common.notSet')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resume Upload */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-indigo-600" />
                {t('profile.uploadResume')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{t('profile.uploadSubtitle')}</p>

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

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-700">
                💡 {t('profile.resumeTip')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Rewrite Resume for a Job */}
        <Card className="border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              {t('profile.rewriteResume')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{t('profile.rewriteSubtitle')}</p>

            <div className="flex items-center gap-4">
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
                onClick={() => document.getElementById('rewrite-resume-input').click()}
              >
                <FileText className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                {rewriteFile ? rewriteFile.name : t('profile.chooseResume')}
              </Button>
              {rewriteFile && (
                <button
                  className="text-xs text-gray-400 hover:text-red-400"
                  onClick={() => setRewriteFile(null)}
                >
                  ✕ clear
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t('profile.jobDescription')}</label>
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
              disabled={isRewriting || !rewriteFile || !rewriteJD.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
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
        <Card className="border border-gray-100">
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
        <Card className="border border-gray-100">
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
                <p className="text-gray-900 font-medium">{user.location_preference || t('common.notSet')}</p>
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
                  <p className="text-gray-900 font-medium">
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
                  <p className="text-gray-900 font-medium">
                    {user.salary_max ? `₪${user.salary_max.toLocaleString()}` : t('common.notSet')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              {t('profile.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">{t('profile.notificationsSubtitle')}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{t('profile.interviewReminders')}</p>
                  <p className="text-sm text-gray-500">{t('profile.interviewRemindersDesc')}</p>
                </div>
                <div className="text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{t('profile.followUpReminders')}</p>
                  <p className="text-sm text-gray-500">{t('profile.followUpRemindersDesc')}</p>
                </div>
                <div className="text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{t('profile.deadlineAlerts')}</p>
                  <p className="text-sm text-gray-500">{t('profile.deadlineAlertsDesc')}</p>
                </div>
                <div className="text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-700">
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
              className="bg-indigo-600 hover:bg-indigo-700"
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
