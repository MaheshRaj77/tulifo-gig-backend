-- Add comprehensive profile links to worker_profiles table

ALTER TABLE worker_profiles
ADD COLUMN resume_url TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN github_url TEXT,
ADD COLUMN leetcode_url TEXT,
ADD COLUMN hackerrank_url TEXT,
ADD COLUMN personal_website TEXT;
