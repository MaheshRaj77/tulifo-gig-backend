/**
 * Database Security Configuration
 * Implements encryption, access control, and data protection
 */

// ═══════════════════════════════════════════════════════════════════
// SQL Migrations for Security
// ═══════════════════════════════════════════════════════════════════

/**
 * Execute this SQL to add security features to your database:
 * 
 * 1. Enable encryption for sensitive columns
 * 2. Add row-level security (RLS)
 * 3. Set up audit logs
 * 4. Add constraints and checks
 */

export const securityMigrations = String.raw`
-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add encrypted sensitive data columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS ssn_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS encryption_version INT DEFAULT 1;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  action VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_id (user_id),
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_event_type (event_type)
);

-- Create sessions table with security fields
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_token_hash (token_hash),
  INDEX idx_sessions_expires_at (expires_at)
);

-- Create security events table
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- LOGIN_ATTEMPT, FAILED_LOGIN, PASSWORD_RESET, 2FA_ENABLED, etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  severity VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_events_user_id (user_id),
  INDEX idx_security_events_created_at (created_at),
  INDEX idx_security_events_severity (severity)
);

-- Create two-factor authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  secret_key BYTEA NOT NULL,
  backup_codes TEXT[] NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create failed login attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_failed_logins_email (email),
  INDEX idx_failed_logins_ip (ip_address),
  INDEX idx_failed_logins_created_at (created_at)
);

-- Enable Row Level Security (RLS) on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own data
CREATE POLICY user_isolation ON users
  FOR SELECT
  USING (id = current_user_id()::uuid OR is_admin IS true);

-- Create policy: Users can only update their own data
CREATE POLICY user_update ON users
  FOR UPDATE
  USING (id = current_user_id()::uuid OR is_admin IS true);

-- Enable RLS on sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own sessions
CREATE POLICY session_isolation ON user_sessions
  FOR SELECT
  USING (user_id = current_user_id()::uuid);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own audit logs (unless admin)
CREATE POLICY audit_log_isolation ON audit_logs
  FOR SELECT
  USING (user_id = current_user_id()::uuid OR current_user_is_admin());

-- Add check constraints
ALTER TABLE users
ADD CONSTRAINT email_format_check CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'),
ADD CONSTRAINT password_length_check CHECK (length(password_hash) > 20);

-- Create function to prevent password reuse (last 5 passwords)
CREATE TABLE IF NOT EXISTS password_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_history_user_id (user_id)
);

-- Add privilege-based access control
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, permission)
);

-- Create procedure to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type VARCHAR,
  p_user_id UUID,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR,
  p_action VARCHAR,
  p_changes JSONB,
  p_ip_address INET,
  p_user_agent TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    event_type, user_id, resource_type, resource_id, 
    action, changes, ip_address, user_agent, status
  ) VALUES (
    p_event_type, p_user_id, p_resource_type, p_resource_id,
    p_action, p_changes, p_ip_address, p_user_agent, 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);

-- Grant permissions (example for auth service role)
GRANT SELECT, INSERT, UPDATE ON users TO auth_service_role;
GRANT SELECT, INSERT ON audit_logs TO auth_service_role;
GRANT SELECT, INSERT ON security_events TO auth_service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO auth_service_role;
`;

// ═══════════════════════════════════════════════════════════════════
// Data Encryption Configuration
// ═══════════════════════════════════════════════════════════════════

export const encryptionConfig = {
  // List of sensitive columns that should be encrypted
  sensitiveColumns: [
    'phone_number',
    'ssn',
    'bank_account',
    'social_security_number',
  ],

  // Encryption algorithm
  algorithm: 'aes-256-gcm',

  // Key rotation policy
  keyRotationIntervalDays: 90,

  // Supported encryption versions
  versions: {
    1: 'aes-256-gcm',
    2: 'aes-256-gcm-v2', // Future version
  },
};

// ═══════════════════════════════════════════════════════════════════
// Access Control Configuration
// ═══════════════════════════════════════════════════════════════════

export const accessControlConfig = {
  // Role-based access control
  roles: {
    ADMIN: {
      permissions: ['*'],
      description: 'Full access',
    },
    MODERATOR: {
      permissions: [
        'users.read',
        'users.ban',
        'reports.view',
        'reports.resolve',
      ],
      description: 'Content moderation',
    },
    USER: {
      permissions: [
        'users.read_own',
        'users.update_own',
        'posts.create',
        'posts.read',
        'posts.update_own',
        'posts.delete_own',
      ],
      description: 'Standard user',
    },
    GUEST: {
      permissions: [
        'posts.read',
        'users.read_public',
      ],
      description: 'Limited access',
    },
  },

  // Resource-based access control
  resources: {
    user: {
      owner_can: ['read', 'update', 'delete'],
      admin_can: ['read', 'update', 'delete', 'ban'],
      public_can: ['read_public'],
    },
    post: {
      owner_can: ['read', 'update', 'delete'],
      author_can: ['read', 'create'],
      public_can: ['read_published'],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════
// Audit Logging Configuration
// ═══════════════════════════════════════════════════════════════════

export const auditLoggingConfig = {
  // Events to monitor
  monitoredEvents: [
    'LOGIN',
    'LOGOUT',
    'FAILED_LOGIN',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET',
    'ACCOUNT_CREATED',
    'ACCOUNT_DELETED',
    'PERMISSION_GRANTED',
    'PERMISSION_REVOKED',
    'DATA_EXPORTED',
    'DATA_IMPORTED',
    'ADMIN_ACTION',
    'SUSPICIOUS_ACTIVITY',
    '2FA_ENABLED',
    '2FA_DISABLED',
  ],

  // Retention policy
  retentionDays: 365, // Keep audit logs for 1 year

  // Categories by severity
  severityLevels: {
    LOW: ['LOGIN', 'LOGOUT'],
    MEDIUM: ['PASSWORD_CHANGE', 'PERMISSION_CHANGE'],
    HIGH: ['ACCOUNT_DELETED', 'DATA_EXPORTED', '2FA_DISABLED'],
    CRITICAL: ['UNAUTHORIZED_ACCESS', 'PRIVILEGE_ESCALATION', 'BULK_DATA_ACCESS'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// Compliance Configuration
// ═══════════════════════════════════════════════════════════════════

export const complianceConfig = {
  // GDPR Requirements
  gdpr: {
    enabled: true,
    dataRetentionDays: 365,
    requiresConsent: true,
    consentTypes: ['MARKETING', 'ANALYTICS', 'THIRD_PARTY'],
    supportsDataExport: true,
    supportsDataDeletion: true,
  },

  // Password Policy
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expiryDays: 90,
    historyCount: 5, // Prevent reuse of last 5 passwords
  },

  // Session Policy
  sessionPolicy: {
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 30,
    absoluteTimeoutMinutes: 480, // 8 hours max
    requireMfaForSensitiveOps: true,
  },

  // Account Lockout Policy
  accountLockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    progressiveLockout: true,
  },
};

// ═══════════════════════════════════════════════════════════════════
// Security Monitoring Configuration
// ═══════════════════════════════════════════════════════════════════

export const securityMonitoringConfig = {
  // Suspicious activity detection
  suspiciousActivityThresholds: {
    failed_login_attempts_per_hour: 5,
    api_requests_per_second: 100,
    data_exports_per_day: 5,
    failed_2fa_attempts: 3,
    geographic_anomaly: true, // Detect unusual login locations
  },

  // Alerts
  alertingConfig: {
    enableEmailAlerts: true,
    enableSlackAlerts: true,
    enableSmsAlerts: true,
    criticalEventRecipients: ['security@company.com'],
  },

  // Rate limiting strategies
  rateLimiting: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
    },
    export: {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: 5,
    },
  },
};
