-- Create client_type enum type
CREATE TYPE client_type AS ENUM ('individual', 'business');

-- Add clientType column to client_profiles
ALTER TABLE client_profiles ADD COLUMN client_type client_type NOT NULL DEFAULT 'business';

-- Add individual-specific fields
ALTER TABLE client_profiles ADD COLUMN contact_name VARCHAR(255);
ALTER TABLE client_profiles ADD COLUMN business_email VARCHAR(255);
ALTER TABLE client_profiles ADD COLUMN business_phone VARCHAR(20);

-- Rename and update existing fields for clarity
ALTER TABLE client_profiles RENAME COLUMN company TO company_name;
ALTER TABLE client_profiles RENAME COLUMN description TO company_description;

-- Add new shared fields
ALTER TABLE client_profiles ADD COLUMN location VARCHAR(255);
ALTER TABLE client_profiles ADD COLUMN country VARCHAR(100);
ALTER TABLE client_profiles ADD COLUMN timezone VARCHAR(50);
ALTER TABLE client_profiles ADD COLUMN budget_range VARCHAR(50);
ALTER TABLE client_profiles ADD COLUMN preferred_contract_types JSONB;

-- Add verification status field
ALTER TABLE client_profiles ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';

-- Update website field to handle null
ALTER TABLE client_profiles ALTER COLUMN website DROP NOT NULL;

-- Create index for client type lookups
CREATE INDEX idx_client_profiles_client_type ON client_profiles(client_type);
CREATE INDEX idx_client_profiles_user_id ON client_profiles(user_id);
