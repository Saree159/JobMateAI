import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Bookmark, ArrowRight, Sparkles } from "lucide-react";

export default function JobCard({ job, onView }) {
  return (
    <Card className="border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer group" onClick={onView}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {job.title}
              </h3>
              {job.isSaved && (
                <Bookmark className="w-4 h-4 fill-indigo-600 text-indigo-600 flex-shrink-0" />
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
            </div>
          </div>
          
          {job.matchScore > 0 && (
            <div className="text-center bg-gray-50 px-3 py-2 rounded-lg">
              <div className={`text-xl font-semibold ${
                job.matchScore >= 70 ? 'text-green-600' : 
                job.matchScore >= 50 ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {job.matchScore}%
              </div>
              <p className="text-xs text-gray-500">
                Match
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-700 line-clamp-3 mb-4">
          {job.description}
        </p>

        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {job.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{job.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex gap-2">
            {job.job_type && (
              <Badge variant="outline" className="text-xs capitalize">
                {job.job_type}
              </Badge>
            )}
            {job.experience_level && (
              <Badge variant="outline" className="text-xs capitalize">
                {job.experience_level}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 group-hover:translate-x-1 transition-transform"
          >
            View
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}