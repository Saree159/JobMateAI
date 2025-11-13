# Frontend-Backend Integration Guide

This document explains how to migrate components from Base44 to the new JobMate AI backend.

## Integration Strategy

The new backend **coexists** with Base44. You can:
1. Keep Base44 for authentication (initially)
2. Use JobMate API for job management, matching, and cover letters
3. Gradually migrate more features as needed

## API Client Usage

### Import the API client

```javascript
import jobMateApi, { userApi, jobApi } from '@/api/jobmate';
```

### Example: Creating a Job

**Old way (Base44):**
```javascript
const createJob = async (jobData) => {
  const job = await base44.entities.Job.create(jobData);
  return job;
};
```

**New way (JobMate API):**
```javascript
import { jobApi } from '@/api/jobmate';

const createJob = async (userId, jobData) => {
  const job = await jobApi.create(userId, {
    title: jobData.title,
    company: jobData.company,
    location: jobData.location,
    description: jobData.description,
    apply_url: jobData.apply_url
  });
  return job;
};
```

### Example: Using React Query with JobMate API

**Fetch user's jobs:**
```javascript
import { useQuery } from '@tanstack/react-query';
import { jobApi } from '@/api/jobmate';

function JobsList({ userId }) {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobmate-jobs', userId],
    queryFn: () => jobApi.listByUser(userId),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
```

**Create a job with mutation:**
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobApi } from '@/api/jobmate';

function AddJobForm({ userId }) {
  const queryClient = useQueryClient();
  
  const createJobMutation = useMutation({
    mutationFn: (jobData) => jobApi.create(userId, jobData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['jobmate-jobs', userId]);
    },
  });

  const handleSubmit = async (formData) => {
    try {
      await createJobMutation.mutateAsync(formData);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Example: Calculate Match Score

```javascript
import { jobApi } from '@/api/jobmate';

const calculateMatch = async (jobId) => {
  const result = await jobApi.calculateMatchScore(jobId);
  console.log('Match Score:', result.match_score);
  console.log('Matched Skills:', result.matched_skills);
  console.log('Missing Skills:', result.missing_skills);
  return result;
};
```

### Example: Generate Cover Letter

```javascript
import { jobApi } from '@/api/jobmate';

const generateCoverLetter = async (jobId) => {
  const result = await jobApi.generateCoverLetter(jobId);
  return result.cover_letter;
};
```

## Component Migration Examples

### Example 1: Jobs Page

**Update `src/pages/Jobs.jsx`** to use JobMate API:

```javascript
import { jobApi } from '@/api/jobmate';

export default function Jobs() {
  const [userId] = useState(1); // Get from auth context
  
  // Use JobMate API instead of Base44
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobmate-jobs', userId],
    queryFn: () => jobApi.listByUser(userId),
  });

  const createJobMutation = useMutation({
    mutationFn: (jobData) => jobApi.create(userId, jobData),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobmate-jobs', userId]);
    },
  });

  // Rest of component...
}
```

### Example 2: Job Details with AI Features

**Create `src/pages/JobDetailsAI.jsx`:**

```javascript
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { jobApi } from '@/api/jobmate';

export default function JobDetailsAI() {
  const { jobId } = useParams();
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  // Fetch job details
  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobApi.getById(parseInt(jobId)),
  });

  // Match score mutation
  const matchScoreMutation = useMutation({
    mutationFn: () => jobApi.calculateMatchScore(parseInt(jobId)),
  });

  // Cover letter mutation
  const coverLetterMutation = useMutation({
    mutationFn: () => jobApi.generateCoverLetter(parseInt(jobId)),
  });

  const handleCalculateMatch = async () => {
    const result = await matchScoreMutation.mutateAsync();
    alert(`Match Score: ${result.match_score}%`);
  };

  const handleGenerateCoverLetter = async () => {
    const result = await coverLetterMutation.mutateAsync();
    setShowCoverLetter(true);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{job.title} at {job.company}</h1>
      <p>Location: {job.location}</p>
      
      {job.match_score !== null && (
        <div>Match Score: {job.match_score}%</div>
      )}
      
      <button onClick={handleCalculateMatch}>
        Calculate Match Score
      </button>
      
      <button onClick={handleGenerateCoverLetter}>
        Generate Cover Letter
      </button>
      
      {showCoverLetter && job.cover_letter && (
        <div>
          <h3>Cover Letter</h3>
          <pre>{job.cover_letter}</pre>
        </div>
      )}
    </div>
  );
}
```

## User Management

### Create a User

```javascript
import { userApi } from '@/api/jobmate';

const registerUser = async (email, password, profile) => {
  const user = await userApi.create({
    email,
    password,
    full_name: profile.fullName,
    target_role: profile.targetRole,
    skills: profile.skills, // Array of strings
    location_preference: profile.location,
    work_mode_preference: profile.workMode, // "remote", "hybrid", or "onsite"
  });
  return user;
};
```

### Update User Profile

```javascript
import { userApi } from '@/api/jobmate';

const updateProfile = async (userId, updates) => {
  const updatedUser = await userApi.update(userId, {
    skills: ['React', 'TypeScript', 'Node.js'],
    target_role: 'Senior Software Engineer',
    location_preference: 'San Francisco, CA',
  });
  return updatedUser;
};
```

## Error Handling

```javascript
import { jobApi } from '@/api/jobmate';

const createJobWithErrorHandling = async (userId, jobData) => {
  try {
    const job = await jobApi.create(userId, jobData);
    return { success: true, data: job };
  } catch (error) {
    console.error('Failed to create job:', error);
    return { success: false, error: error.message };
  }
};
```

## Testing the Integration

1. **Start the backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Test API directly:**
   - Visit http://localhost:8000/docs
   - Try the endpoints in Swagger UI

3. **Test from frontend:**
   ```javascript
   // In browser console
   import { checkApiHealth } from '@/api/jobmate';
   checkApiHealth().then(console.log);
   ```

## Next Steps

1. **Choose migration path**:
   - Start with new features (match scoring, cover letters)
   - Keep existing Base44 features working
   - Gradually migrate CRUD operations

2. **Update components one at a time**:
   - Test each migration thoroughly
   - Keep fallbacks to Base44 if needed

3. **Handle authentication**:
   - Option A: Keep Base44 auth, use user email to link to JobMate backend
   - Option B: Implement full JWT auth in JobMate backend
   - Option C: Hybrid: Base44 for login, JobMate for everything else

## Tips

- Use different query keys for Base44 vs JobMate data: `['base44-jobs']` vs `['jobmate-jobs']`
- The backend uses `user_id` (integer) while Base44 might use emails - map appropriately
- Match the `status` enum values between frontend and backend
- Test AI features with real OpenAI API key in `.env`
