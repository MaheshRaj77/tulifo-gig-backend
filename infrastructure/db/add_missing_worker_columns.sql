-- Add missing columns to worker_profiles table
ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS leetcode_url TEXT,
ADD COLUMN IF NOT EXISTS hackerrank_url TEXT,
ADD COLUMN IF NOT EXISTS personal_website TEXT,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS hours_per_week INTEGER,
ADD COLUMN IF NOT EXISTS preferred_work_types TEXT[] DEFAULT '{}';

-- verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'worker_profiles' 
AND column_name IN ('languages', 'resume_url', 'country');
