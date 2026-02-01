#!/usr/bin/env node

/**
 * Test MongoDB Connection
 * This script verifies connectivity to MongoDB without requiring mongosh CLI
 */

const fs = require('node:fs');
const path = require('node:path');

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

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('ERROR: MONGODB_URI not set');
  process.exit(1);
}

// Try to connect using native Node.js with minimal dependencies
async function testMongoConnection() {
  try {
    // First try local MongoDB
    const net = require('node:net');
    const localClient = net.createConnection(27017, 'localhost', () => {
      console.log('✓ MongoDB (Local) - Connected at localhost:27017');
      localClient.destroy();
      process.exit(0);
    });

    localClient.on('error', (err) => {
      // Try Atlas if local fails
      console.log('Local MongoDB not available, trying Atlas...');
      const url = new URL(mongoUri);
      const host = url.hostname;
      const port = url.port || 27017;

      console.log(`Attempting TCP connection to ${host}:${port}...`);
      
      const atlasClient = net.createConnection(Number.parseInt(port), host, () => {
        console.log('✓ MongoDB (Atlas) - Accessible at ' + host + ':' + port);
        atlasClient.destroy();
        process.exit(0);
      });

      atlasClient.on('error', (err) => {
        console.error('✗ MongoDB - Connection failed:', err.message);
        process.exit(1);
      });

      setTimeout(() => {
        atlasClient.destroy();
        console.error('✗ MongoDB - Connection timeout');
        process.exit(1);
      }, 10000);
    });

    setTimeout(() => {
      localClient.destroy();
    }, 5000);
  } catch (err) {
    console.error('✗ MongoDB - Connection failed:', err.message);
    process.exit(1);
  }
}

testMongoConnection();
