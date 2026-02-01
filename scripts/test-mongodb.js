#!/usr/bin/env node

/**
 * Test MongoDB Connection
 * This script verifies connectivity to MongoDB without requiring mongosh CLI
 */

const fs = require('fs');
const path = require('path');

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
    // Try native MongoDB driver first
    try {
      const { MongoClient } = require('mongodb');
      
      const client = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        retryWrites: true,
      });

      console.log('Connecting to MongoDB Atlas...');
      await client.connect();
      
      // Test the connection with a ping
      const admin = client.db('admin');
      await admin.command({ ping: 1 });
      
      console.log('✓ MongoDB (Atlas) - Connected');
      await client.close();
      process.exit(0);
    } catch (mongoErr) {
      // If mongodb driver not available, try TCP test on Atlas
      const url = new URL(mongoUri);
      const host = url.hostname;
      const port = url.port || 27017;

      console.log(`Attempting TCP connection to ${host}:${port}...`);
      
      const net = require('net');
      const client = net.createConnection(parseInt(port), host, () => {
        console.log(`✓ MongoDB (Atlas) - Accessible at ${host}:${port}`);
        client.destroy();
        process.exit(0);
      });

      client.on('error', (err) => {
        console.error('✗ MongoDB (Atlas) - Connection failed:', err.message);
        process.exit(1);
      });

      setTimeout(() => {
        client.destroy();
        console.error('✗ MongoDB (Atlas) - Connection timeout');
        process.exit(1);
      }, 10000);
    }
  } catch (err) {
    console.error('✗ MongoDB (Atlas) - Connection failed:', err.message);
    process.exit(1);
  }
}

testMongoConnection();
