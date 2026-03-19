-- Add languages column to worker_profiles table

ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
