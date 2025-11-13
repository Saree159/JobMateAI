import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, CheckCircle } from "lucide-react";

export default function JobFilters({ filters, setFilters }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select 
        value={filters.status || 'all'} 
        onValueChange={(value) => setFilters({ ...filters, status: value })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="saved">Saved</SelectItem>
          <SelectItem value="applied">Applied</SelectItem>
          <SelectItem value="interview">Interview</SelectItem>
          <SelectItem value="offer">Offer</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.job_type} 
        onValueChange={(value) => setFilters({ ...filters, job_type: value })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Job Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="full-time">Full Time</SelectItem>
          <SelectItem value="part-time">Part Time</SelectItem>
          <SelectItem value="contract">Contract</SelectItem>
          <SelectItem value="freelance">Freelance</SelectItem>
          <SelectItem value="internship">Internship</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.experience_level} 
        onValueChange={(value) => setFilters({ ...filters, experience_level: value })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="entry">Entry</SelectItem>
          <SelectItem value="junior">Junior</SelectItem>
          <SelectItem value="mid">Mid</SelectItem>
          <SelectItem value="senior">Senior</SelectItem>
          <SelectItem value="lead">Lead</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1 min-w-[200px]">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Filter by location..."
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="pl-9"
        />
      </div>
    </div>
  );
}