-- Add new columns to bids table
ALTER TABLE bids ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS ai_score DECIMAL(5, 2);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
ALTER TABLE bids ADD CONSTRAINT bids_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'shortlisted'));

-- Create agreements table
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    scope TEXT NOT NULL,
    deliverables JSONB DEFAULT '[]',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(20) DEFAULT 'fixed' CHECK (payment_type IN ('fixed', 'hourly', 'milestone')),
    duration INTEGER,
    duration_unit VARCHAR(10) DEFAULT 'days' CHECK (duration_unit IN ('hours', 'days', 'weeks', 'months')),
    start_date DATE,
    end_date DATE,
    terms TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_worker', 'pending_client', 'active', 'completed', 'cancelled', 'disputed')),
    client_signed_at TIMESTAMP WITH TIME ZONE,
    worker_signed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreements_project_id ON agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_agreements_worker_id ON agreements(worker_id);
CREATE INDEX IF NOT EXISTS idx_agreements_client_id ON agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);

DROP TRIGGER IF EXISTS update_agreements_updated_at ON agreements;
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
