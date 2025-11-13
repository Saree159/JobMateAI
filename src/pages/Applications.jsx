import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { jobApi } from "@/api/jobmate";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApplicationCard from "../components/applications/ApplicationCard";
import ApplicationStats from "../components/applications/ApplicationStats";

export default function Applications() {
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

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          My Applications
        </h1>
        <p className="text-gray-500">
          Track and manage your job applications
        </p>
      </div>

      {/* Stats */}
      <ApplicationStats stats={stats} />

      {/* Filter Tabs */}
      <Card className="border border-gray-100 mb-8">
        <CardContent className="p-6">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="saved">Saved ({stats.saved})</TabsTrigger>
              <TabsTrigger value="applied">Applied ({stats.applied})</TabsTrigger>
              <TabsTrigger value="interview">Interview ({stats.interview})</TabsTrigger>
              <TabsTrigger value="offer">Offer ({stats.offer})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Applications List */}
      {appsLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card className="border border-gray-100">
          <CardContent className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No applications {statusFilter !== 'all' && `with status "${statusFilter}"`}
            </h3>
            <p className="text-gray-500">
              Start applying to jobs to see them here
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