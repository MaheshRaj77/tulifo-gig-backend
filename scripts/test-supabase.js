#!/usr/bin/env node

/**
 * Test Supabase PostgreSQL Connection
 * This script verifies connectivity to Supabase without requiring psql
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

// Load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
  }
}

loadEnv();

// Get DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

// Parse PostgreSQL URL
function parsePostgresURL(url) {
  try {
    // Remove postgresql:// prefix
    const urlStr = url.replace('postgresql://', '');
    const [credentials, rest] = urlStr.split('@');
    const [username, password] = credentials.split(':');
    const [host, portAndDb] = rest.split('/');
    const [port, database] = portAndDb.split('/');
    
    return { username, password, host, port, database };
  } catch (error_) {
    console.error('Error resolving Supabase URL:', error_);
    return null;
  }
}

// Test connection via HTTPS (since pg module might not be installed)
function testSupabaseConnection() {
  const parsed = parsePostgresURL(dbUrl);
  
  if (!parsed) {
    console.error('ERROR: Could not parse DATABASE_URL');
    process.exit(1);
  }

  // Test by making a request to Supabase API
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not configured');
    console.log('However, DATABASE_URL is set to:', parsed.host);
    
    // Try TCP port test instead
    const net = require('node:net');
    const client = net.createConnection(Number.parseInt(parsed.port), parsed.host);
    
    client.on('connect', () => {
      console.log('✓ PostgreSQL (Supabase pooler) is accessible at', parsed.host + ':' + parsed.port);
      client.destroy();
      process.exit(0);
    });
    
    client.on('error', () => {
      console.error('✗ PostgreSQL connection failed');
      process.exit(1);
    });
    
    setTimeout(() => {
      client.destroy();
      console.error('✗ PostgreSQL connection timeout');
      process.exit(1);
    }, 5000);
    
    return;
  }

  // Test Supabase API health
  https.get(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 5000
  }, (res) => {
    if (res.statusCode === 200 || res.statusCode === 401) {
      // 401 is OK - means Supabase is reachable but needs valid auth
      console.log('✓ PostgreSQL (Supabase) - Connected');
      process.exit(0);
    } else {
      console.error('✗ PostgreSQL - Unexpected status:', res.statusCode);
      process.exit(1);
    }
  }).on('error', (err) => {
    console.error('✗ PostgreSQL - Connection failed:', err.message);
    process.exit(1);
  });
}

testSupabaseConnection();
