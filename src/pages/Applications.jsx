import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter, Loader2, Download, FileSpreadsheet, FileDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ApplicationCard from "../components/applications/ApplicationCard";
import ApplicationStats from "../components/applications/ApplicationStats";
import { exportToCSV, exportToPDF } from "@/utils/exportUtils";

export default function Applications() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const { user } = useAuth();

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['applications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await jobApi.listByUser(user.id);
    },
    enabled: !!user?.id,
  });

  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === statusFilter);

  const stats = {
    total: applications.length,
    saved: applications.filter(a => a.status === 'saved').length,
    applied: applications.filter(a => a.status === 'applied').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(filteredApplications);
      toast.success('Applications exported to CSV successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to export applications');
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(filteredApplications);
      toast.success('Applications exported to PDF successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to export applications');
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            {t('applications.title')}
          </h1>
          <p className="text-gray-500">
            {t('applications.subtitle')}
          </p>
        </div>
        
        {/* Export Button */}
        {applications.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {t('applications.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {t('applications.exportCSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                <FileDown className="w-4 h-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stats */}
      <ApplicationStats stats={stats} />

      {/* Filter Tabs */}
      <Card className="border border-white/5 mb-8">
        <CardContent className="p-6">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-white/10">
              <TabsTrigger value="all">{t('jobs.all')} ({stats.total})</TabsTrigger>
              <TabsTrigger value="saved">{t('jobs.saved_status')} ({stats.saved})</TabsTrigger>
              <TabsTrigger value="applied">{t('jobs.applied_status')} ({stats.applied})</TabsTrigger>
              <TabsTrigger value="interview">{t('jobs.interview_status')} ({stats.interview})</TabsTrigger>
              <TabsTrigger value="offer">{t('jobs.offer_status')} ({stats.offer})</TabsTrigger>
              <TabsTrigger value="rejected">{t('jobs.rejected_status')} ({stats.rejected})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Applications List */}
      {appsLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-white/5">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <Skeleton className="w-14 h-14 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card className="border border-white/5">
          <CardContent className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              {t('applications.noApplications')}
            </h3>
            <p className="text-gray-500">
              {t('applications.startApplying')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((application) => (
            <ApplicationCard 
              key={application.id} 
              application={application}
            />
          ))}
        </div>
      )}
    </div>
  );
}