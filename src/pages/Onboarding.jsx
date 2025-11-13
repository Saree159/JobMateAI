import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { userApi } from "@/api/jobmate";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Briefcase, MapPin, DollarSign, User, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    target_role: '',
    skills: [],
    location_preference: '',
    work_mode_preference: 'remote',
    bio: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');

  const updateUserMutation = useMutation({
    mutationFn: (data) => userApi.update(user.id, data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate(createPageUrl("dashboard"));
    },
    onError: (error) => {
      setError('Failed to save profile. Please try again.');
    },
  });

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

  const handleNext = () => {
    if (step === 1 && !formData.target_role) {
      setError('Please enter your target job role');
      return;
    }
    if (step === 2 && formData.skills.length === 0) {
      setError('Please add at least one skill');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleComplete = () => {
    if (!formData.location_preference) {
      setError('Please enter your location preference');
      return;
    }
    
    updateUserMutation.mutate({
      target_role: formData.target_role,
      skills: formData.skills,
      location_preference: formData.location_preference,
      work_mode_preference: formData.work_mode_preference,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-2xl border border-gray-100">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to JobMate AI</CardTitle>
          <CardDescription className="text-lg mt-2">
            Let's set up your profile to find the perfect jobs
          </CardDescription>
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? 'w-8 bg-indigo-600' : s < step ? 'w-2 bg-indigo-400' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="pb-10 px-10">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Job Role */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <Briefcase className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">What's your target job role?</h3>
                <p className="text-gray-600 text-sm mt-1">e.g., Junior Backend Developer, Product Manager</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_role">Job Title</Label>
                <Input
                  id="target_role"
                  placeholder="Enter your desired job title"
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  className="text-lg py-6"
                  autoFocus
                />
              </div>
              <Button 
                onClick={handleNext} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg"
                size="lg"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <User className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">What are your key skills?</h3>
                <p className="text-gray-600 text-sm mt-1">Add technologies, tools, and competencies</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="skill">Add Skills</Label>
                <div className="flex gap-2">
                  <Input
                    id="skill"
                    placeholder="e.g., Python, React, SQL"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    className="flex-1"
                  />
                  <Button onClick={handleAddSkill} variant="outline">Add</Button>
                </div>
              </div>

              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg min-h-[80px]">
                  {formData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep(1)} 
                  variant="outline"
                  className="flex-1 py-6"
                  size="lg"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-6"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Location & Preferences */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <MapPin className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">Final details</h3>
                <p className="text-gray-600 text-sm mt-1">Help us find the right opportunities</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location Preference *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Tel Aviv, Remote, Hybrid"
                    value={formData.location_preference}
                    onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary_min">Min Salary (₪)</Label>
                    <Input
                      id="salary_min"
                      type="number"
                      placeholder="10000"
                      value={formData.salary_min}
                      onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary_max">Max Salary (₪)</Label>
                    <Input
                      id="salary_max"
                      type="number"
                      placeholder="20000"
                      value={formData.salary_max}
                      onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    placeholder="3"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Summary (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Brief summary of your background and career goals..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep(2)} 
                  variant="outline"
                  className="flex-1 py-6"
                  size="lg"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={updateUserMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-6"
                  size="lg"
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}