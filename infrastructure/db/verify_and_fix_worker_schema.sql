-- Verify and fix worker_profiles schema
-- This script adds any missing columns to the worker_profiles table

-- Add languages column if it doesn't exist
ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';

-- Verify all URL columns exist
ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS resume_url TEXT;

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS github_url TEXT;

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS leetcode_url TEXT;

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS hackerrank_url TEXT;

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS personal_website TEXT;

-- Display the current table structure to verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'worker_profiles'
ORDER BY ordinal_position;
