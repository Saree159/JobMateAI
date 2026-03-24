import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Globe, AlertCircle, X, MapPin, Building2, Briefcase, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import JobCard from "../components/jobs/JobCard";

const DRUSHIM_CATEGORIES = {
  "236": "אבטחת מידע - כללי (Security - General)",
  "71": "פיתוח תוכנה (Software Development)",
  "72": "QA ובדיקות (QA & Testing)",
  "73": "ניהול מוצר (Product Management)",
  "74": "אנליזה (Analysis)",
  "75": "מדעי נתונים (Data Science)",
};

const JOB_SITES = {
  drushim: {
    name: "Drushim.co.il",
    baseUrl: "https://www.drushim.co.il/jobs/subcat/",
    endpoint: "/api/jobs/scrape/drushim",
    categories: DRUSHIM_CATEGORIES
  },
  gotfriends: {
    name: "GotFriends.co.il",
    baseUrl: "https://gotfriends.co.il/jobs",
    endpoint: "/api/jobs/scrape/gotfriends",
    categories: null // Custom URL only
  }
};

export default function IsraeliJobs() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedSite, setSelectedSite] = useState("drushim");
  const [selectedCategory, setSelectedCategory] = useState("236");
  const [customUrl, setCustomUrl] = useState("");
  const [searchUrl, setSearchUrl] = useState(`https://www.drushim.co.il/jobs/subcat/${selectedCategory}`);
  const [selectedJob, setSelectedJob] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['israeli-jobs', searchUrl, selectedSite],
    queryFn: async () => {
      const site = JOB_SITES[selectedSite];
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${site.endpoint}?url=${encodeURIComponent(searchUrl)}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    },
    enabled: !!searchUrl,
  });

  const handleSiteChange = (site) => {
    setSelectedSite(site);
    if (site === "drushim") {
      setSearchUrl(`https://www.drushim.co.il/jobs/subcat/${selectedCategory}`);
    } else if (site === "gotfriends") {
      setSearchUrl("https://gotfriends.co.il/jobs");
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSearchUrl(`https://www.drushim.co.il/jobs/subcat/${category}`);
  };

  const handleCustomSearch = () => {
    if (customUrl) {
      setSearchUrl(customUrl);
    }
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
  };

  const jobs = data?.jobs || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('israeliJobs.title')}
            </h1>
          </div>
          <p className="text-gray-400">
            {t('israeliJobs.subtitle')} • Drushim.co.il • GotFriends.co.il
          </p>
        </div>

        {/* Search Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Site Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  בחר אתר
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedSite === "drushim" ? "default" : "outline"}
                    onClick={() => handleSiteChange("drushim")}
                    className="flex-1"
                  >
                    Drushim.co.il
                  </Button>
                  <Button
                    variant={selectedSite === "gotfriends" ? "default" : "outline"}
                    onClick={() => handleSiteChange("gotfriends")}
                    className="flex-1"
                  >
                    GotFriends.co.il
                  </Button>
                </div>
              </div>

              {/* Category Selection (Drushim only) */}
              {selectedSite === "drushim" && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    בחר קטגוריה
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(DRUSHIM_CATEGORIES).map(([id, name]) => (
                      <Button
                        key={id}
                        variant={selectedCategory === id ? "default" : "outline"}
                        onClick={() => handleCategoryChange(id)}
                        className="justify-start text-right h-auto py-2 whitespace-normal leading-snug text-xs"
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom URL */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  או הזן כתובת מותאמת אישית
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://www.drushim.co.il/jobs/..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleCustomSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    חפש
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ltr:ml-3 rtl:mr-3 text-gray-400">{t('israeliJobs.loading')}</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              שגיאה בטעינת המשרות. נסה שוב מאוחר יותר.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && jobs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('israeliJobs.noJobsFound')}
              </h3>
              <p className="text-gray-400">
                {t('israeliJobs.tryDifferent')}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && jobs.length > 0 && (
          <>
            <div className="mb-4 text-gray-400">
              {t('israeliJobs.totalJobs', { count: jobs.length })} — {data.source}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, index) => (
                <JobCard
                  key={index}
                  job={{
                    id: `israeli-${index}`,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description,
                    matchScore: 0,
                    isSaved: false,
                    job_type: job.job_type,
                    experience_level: job.experience_level,
                    apply_url: job.url,
                  }}
                  onView={() => handleJobClick(job)}
                />
              ))}
            </div>
          </>
        )}

        {/* Job Details Dialog */}
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedJob && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-right">
                    {selectedJob.title}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 text-right" dir="rtl">
                  {/* Company & Location */}
                  <div className="flex flex-wrap gap-4 justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{selectedJob.company}</span>
                      <Building2 className="w-5 h-5 text-gray-500" />
                    </div>
                    {selectedJob.location && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{selectedJob.location}</span>
                        <MapPin className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Job Type & Experience */}
                  <div className="flex flex-wrap gap-2 justify-end">
                    {selectedJob.job_type && (
                      <Badge variant="secondary">
                        <Briefcase className="w-3 h-3 ml-1" />
                        {selectedJob.job_type}
                      </Badge>
                    )}
                    {selectedJob.experience_level && (
                      <Badge variant="secondary">
                        <Award className="w-3 h-3 ml-1" />
                        {selectedJob.experience_level}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">תיאור המשרה</h3>
                    <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                      {selectedJob.description}
                    </div>
                  </div>

                  {/* Skills */}
                  {selectedJob.skills && selectedJob.skills.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">כישורים נדרשים</h3>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {selectedJob.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salary */}
                  {(selectedJob.salary_min || selectedJob.salary_max) && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-2">שכר</h3>
                      <div className="text-gray-600">
                        {selectedJob.salary_min && selectedJob.salary_max
                          ? `₪${selectedJob.salary_min.toLocaleString()} - ₪${selectedJob.salary_max.toLocaleString()}`
                          : selectedJob.salary_min
                          ? `החל מ-₪${selectedJob.salary_min.toLocaleString()}`
                          : `עד ₪${selectedJob.salary_max.toLocaleString()}`}
                      </div>
                    </div>
                  )}

                  {/* Apply Link */}
                  <div className="border-t pt-6">
                    <Button
                      onClick={() => window.open(selectedJob.url, '_blank')}
                      className="w-full"
                    >
                      הגש מועמדות באתר המעסיק
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
