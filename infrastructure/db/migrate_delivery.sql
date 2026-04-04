-- Add work delivery columns to agreements table
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS delivery_url TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS work_submitted_at TIMESTAMP WITH TIME ZONE;

-- Expand status check to include pending_review
ALTER TABLE agreements DROP CONSTRAINT IF EXISTS agreements_status_check;
ALTER TABLE agreements ADD CONSTRAINT agreements_status_check
    CHECK (status IN ('draft', 'pending_worker', 'pending_client', 'active', 'pending_review', 'completed', 'cancelled', 'disputed'));
