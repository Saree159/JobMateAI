import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { userApi } from "@/api/jobmate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Briefcase, MapPin, DollarSign, X, Save, CheckCircle2, Crown, Upload, FileUp, Loader2, Bell, Mail } from "lucide-react";
import SubscriptionBadge from "../components/subscription/SubscriptionBadge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [skillInput, setSkillInput] = useState('');
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadResumeMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/api/resume/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      queryClient.invalidateQueries(['currentUser']);
      toast.success(`Resume parsed! Updated: ${data.updated_fields.join(', ')}`);
      // Update local user state
      queryClient.setQueryData(['currentUser'], data.user);
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
    
    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    setIsUploading(true);
    uploadResumeMutation.mutate(file);
  };

  const updateUserMutation = useMutation({
    mutationFn: (data) => userApi.update(user.id, data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['currentUser'], updatedUser);
      setIsEditing(false);
      setSuccess(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const startEditing = () => {
    setFormData({
      target_role: user?.target_role || '',
      skills: user?.skills ? user.skills.split(',').map(s => s.trim()) : [],
      location_preference: user?.location_preference || '',
      work_mode_preference: user?.work_mode_preference || '',
      bio: user?.bio || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateUserMutation.mutate({
      ...formData,
      skills: formData.skills.join(', '),
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
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-gray-500">Manage your job search preferences</p>
        </div>
        {!isEditing && (
          <Button onClick={startEditing} className="bg-indigo-600 hover:bg-indigo-700">
            Edit Profile
          </Button>
        )}
      </div>

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Subscription Card */}
        <Card className={`border ${isPro ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {isPro ? <Crown className="w-5 h-5 text-indigo-600" /> : <User className="w-5 h-5 text-gray-600" />}
                Subscription
              </span>
              <SubscriptionBadge tier={currentPlan} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{isPro ? 'Pro Plan' : 'Free Plan'}</p>
                <p className="text-sm text-gray-600">
                  {isPro ? 'Unlimited access to all features' : 'Limited to 5 job views per day'}
                </p>
              </div>
              <Button
                variant={isPro ? "outline" : "default"}
                onClick={() => navigate(createPageUrl("Pricing"))}
                className={!isPro ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" : ""}
              >
                {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
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
              Career Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Job Role</Label>
              {isEditing ? (
                <Input
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  placeholder="e.g., Senior Backend Developer"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user.target_role || 'Not set'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Years of Experience</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  placeholder="5"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user.experience_years || 'Not set'} years</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Professional Summary</Label>
              {isEditing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief summary of your background..."
                  rows={4}
                />
              ) : (
                <p className="text-gray-700">{user.bio || 'Not set'}</p>
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
                Upload Resume
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload your resume (PDF) to automatically extract and populate your profile information
            </p>
            
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf"
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing Resume...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose PDF File
                    </>
                  )}
                </Button>
              </label>
              <span className="text-sm text-gray-500">Max 5MB</span>
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-700">
                💡 We'll extract your skills, job title, and location from your resume
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="font-semibold">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <Button onClick={handleAddSkill} variant="outline">Add</Button>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {(isEditing ? formData.skills : user.skills || []).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                  {skill}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {(!user.skills || user.skills.length === 0) && !isEditing && (
                <p className="text-gray-500">No skills added yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="font-semibold">
              Job Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Location Preference</Label>
              {isEditing ? (
                <Input
                  value={formData.location_preference}
                  onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                  placeholder="e.g., Tel Aviv, Remote, Hybrid"
                />
              ) : (
                <p className="text-gray-900 font-medium">{user.location_preference || 'Not set'}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Salary (₪)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    placeholder="10000"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {user.salary_min ? `₪${user.salary_min.toLocaleString()}` : 'Not set'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Max Salary (₪)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    placeholder="20000"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {user.salary_max ? `₪${user.salary_max.toLocaleString()}` : 'Not set'}
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
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Get email reminders for important events (coming soon)
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Interview Reminders</p>
                  <p className="text-sm text-gray-500">Get notified 24 hours before interviews</p>
                </div>
                <div className="text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Follow-Up Reminders</p>
                  <p className="text-sm text-gray-500">Remind me to follow up after 7 days</p>
                </div>
                <div className="text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Deadline Alerts</p>
                  <p className="text-sm text-gray-500">Alert me about upcoming application deadlines</p>
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
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateUserMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}