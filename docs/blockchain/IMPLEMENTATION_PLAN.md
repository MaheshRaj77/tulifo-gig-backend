# Tulifo Blockchain Implementation Plan

**Version:** 1.0  
**Date:** February 8, 2026  
**Objective:** Implement and test blockchain service in scratch directory, then integrate into tulifo-gig-backend

---

## Overview

This plan outlines the step-by-step process to:
1. **Set up** the blockchain development environment
2. **Test** the smart contracts locally
3. **Run** the blockchain-service backend
4. **Integrate** with Stripe Crypto for fiat on-ramp
5. **Validate** everything works before integrating into tulifo-gig-backend

---

## Phase 1: Environment Setup (Day 1)

### 1.1 Prerequisites

```bash
# Verify Node.js version (v18+ required)
node -v

# Verify npm
npm -v

# Install pnpm if not available
npm install -g pnpm
```

### 1.2 Navigate to Blockchain Service

```bash
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
```

### 1.3 Install Dependencies

```bash
pnpm install
```

### 1.4 Create Environment File

Create `.env` file in `blockchain-service` directory:

```env
# Local Development
PORT=3016
NODE_ENV=development

# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337

# Default Hardhat Private Key (Account #0 - DO NOT USE IN PRODUCTION)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract Addresses (will be filled after deployment)
ESCROW_CONTRACT_ADDRESS=
NFT_CONTRACT_ADDRESS=
REPUTATION_CONTRACT_ADDRESS=
TUSD_CONTRACT_ADDRESS=

# Stripe Configuration (for Crypto Onramp integration)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_CRYPTO_ENABLED=true
```

### 1.5 Verification Checkpoint ✅

- [ ] Node.js v18+ installed
- [ ] Dependencies installed without errors
- [ ] `.env` file created

---

## Phase 2: Smart Contract Compilation & Testing (Day 1-2)

### 2.1 Compile Smart Contracts

```bash
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
pnpm run compile
```

**Expected Output:**
```
Compiled 4 Solidity files successfully
```

### 2.2 Start Local Blockchain Node

Open a **new terminal** and run:

```bash
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
npx hardhat node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51... (10000 ETH)
Private Key: 0xac0974bec39...
...
```

> ⚠️ **Keep this terminal running!** This is your local blockchain.

### 2.3 Run Smart Contract Tests

Open a **second terminal**:

```bash
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
pnpm run test
```

**Expected Output:**
```
  TulifoEscrow
    ✓ Should create escrow successfully
    ✓ Should release funds to worker
    ✓ Should refund client
    ✓ Should handle admin refund

  TulifoNFT
    ✓ Should issue certificate
    ✓ Should retrieve certificate by owner

  TulifoReputation
    ✓ Should add rating
    ✓ Should calculate average correctly

  8 passing
```

### 2.4 Verification Checkpoint ✅

- [ ] Contracts compiled successfully
- [ ] Local Hardhat node running on port 8545
- [ ] All 8 tests passing

---

## Phase 3: Deploy Contracts to Local Node (Day 2)

### 3.1 Deploy Contracts

With the Hardhat node still running, open another terminal:

```bash
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
pnpm run deploy:local
```

**Expected Output:**
```
Deploying contracts with the account: 0xf39Fd6e51...
TulifoUSD deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
TulifoEscrow deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TulifoNFT deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TulifoReputation deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### 3.2 Update .env with Contract Addresses

Update your `.env` file with the deployed addresses:

```env
ESCROW_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NFT_CONTRACT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
REPUTATION_CONTRACT_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
TUSD_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 3.3 Verification Checkpoint ✅

- [ ] All 4 contracts deployed
- [ ] Contract addresses saved to `.env`

---

## Phase 4: Run Blockchain Backend Service (Day 2-3)

### 4.1 Start the Backend Service

```bash
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
pnpm run dev
```

**Expected Output:**
```
🔗 Blockchain Service running on port 3016
✅ Connected to blockchain network (Chain ID: 31337)
✅ Escrow contract loaded
✅ NFT contract loaded
✅ Reputation contract loaded
```

### 4.2 Test API Endpoints

#### Health Check
```bash
curl http://localhost:3016/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "blockchain-service",
  "network": "localhost",
  "chainId": 31337
}
```

#### Test Escrow Creation
```bash
curl -X POST http://localhost:3016/api/v1/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "clientAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "workerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "amount": "100",
    "bookingId": "booking-001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "escrowId": "0x...",
  "transactionHash": "0x...",
  "amount": "100"
}
```

### 4.3 Verification Checkpoint ✅

- [ ] Backend service running on port 3016
- [ ] Health endpoint returns healthy status
- [ ] Escrow creation API works

---

## Phase 5: Stripe Crypto Integration (Day 3-4)

### 5.1 Enable Stripe Crypto in Dashboard

1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Settings** → **Payments** → **Payment Methods**
3. Enable **Crypto** payments
4. Configure USDC on Polygon network

### 5.2 Create Stripe Crypto Onramp Route

Create file: `src/routes/stripe-crypto.routes.ts`

```typescript
import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create crypto onramp session
router.post('/create-onramp-session', async (req, res) => {
  try {
    const { amount, walletAddress, bookingId } = req.body;

    // Create Stripe Crypto Onramp Session
    const session = await stripe.crypto.onrampSessions.create({
      wallet_addresses: {
        polygon: walletAddress
      },
      destination_networks: ['polygon'],
      destination_currencies: ['usdc'],
      source_amount: amount,
      source_currency: 'usd',
      metadata: {
        bookingId,
        platform: 'tulifo'
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      clientSecret: session.client_secret,
      onrampUrl: session.redirect_url
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Webhook for crypto payment completion
router.post('/webhook', async (req, res) => {
  const event = req.body;

  if (event.type === 'crypto.onramp_session.completed') {
    const session = event.data.object;
    
    // USDC has been sent to user's wallet
    // Now create escrow with the received USDC
    console.log('Crypto onramp completed:', session.id);
    console.log('Wallet:', session.wallet_addresses.polygon);
    console.log('Amount:', session.destination_amount);
    
    // TODO: Trigger escrow creation via blockchain-service
  }

  res.json({ received: true });
});

export default router;
```

### 5.3 Update Main Server

Add to `src/index.ts`:

```typescript
import stripeRoutes from './routes/stripe-crypto.routes';

// Add after other routes
app.use('/api/v1/stripe', stripeRoutes);
```

### 5.4 Verification Checkpoint ✅

- [ ] Stripe Crypto enabled in dashboard
- [ ] Crypto onramp route created
- [ ] Webhook endpoint ready

---

## Phase 6: End-to-End Testing (Day 4-5)

### 6.1 Complete Payment Flow Test

**Test Scenario:** Client pays for a service using Stripe Crypto Onramp

```bash
# Step 1: Create onramp session
curl -X POST http://localhost:3016/api/v1/stripe/create-onramp-session \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "50.00",
    "walletAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "bookingId": "booking-test-001"
  }'

# Step 2: Use the onrampUrl to complete payment (manual browser test)

# Step 3: After webhook confirms, create escrow
curl -X POST http://localhost:3016/api/v1/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "clientAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "workerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "amount": "50",
    "bookingId": "booking-test-001"
  }'

# Step 4: Release escrow (simulate job completion)
curl -X POST http://localhost:3016/api/v1/escrow/release \
  -H "Content-Type: application/json" \
  -d '{
    "escrowId": "<escrow_id_from_step_3>"
  }'
```

### 6.2 NFT Certificate Test

```bash
# Issue skill certificate
curl -X POST http://localhost:3016/api/v1/nft/issue \
  -H "Content-Type: application/json" \
  -d '{
    "recipientAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "skillName": "Web Development",
    "level": "Intermediate",
    "issuedBy": "Tulifo Platform"
  }'

# Get certificates for user
curl http://localhost:3016/api/v1/nft/certificates/0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### 6.3 Reputation Test

```bash
# Add rating
curl -X POST http://localhost:3016/api/v1/reputation/rate \
  -H "Content-Type: application/json" \
  -d '{
    "workerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "rating": 5
  }'

# Get reputation
curl http://localhost:3016/api/v1/reputation/0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Expected Response:**
```json
{
  "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "totalRatings": 1,
  "averageRating": 5,
  "jobsCompleted": 1
}
```

### 6.4 Verification Checkpoint ✅

- [ ] Onramp session creation works
- [ ] Escrow create/release works
- [ ] NFT issuance works
- [ ] Reputation system works

---

## Phase 7: Integration into Tulifo Main Project (Day 5-7)

### 7.1 Copy Blockchain Service to Main Project

```bash
# Copy the tested blockchain-service
cp -r /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service \
      /Users/mahesh/Work/tulifo-gig-backend/apps/blockchain-service
```

### 7.2 Update Workspace Configuration

Add to `/Users/mahesh/Work/tulifo-gig-backend/pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 7.3 Update Payment Service Integration

Modify `/Users/mahesh/Work/tulifo-gig-backend/apps/payment-service/src/index.ts`:

```typescript
import axios from 'axios';

const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://localhost:3016';

// Add crypto payment endpoint
app.post('/api/payments/crypto/initiate', async (req, res) => {
  try {
    const { bookingId, amount, workerWallet, clientWallet } = req.body;

    // Create escrow via blockchain service
    const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/api/v1/escrow/create`, {
      clientAddress: clientWallet,
      workerAddress: workerWallet,
      amount: amount.toString(),
      bookingId
    });

    res.json({
      success: true,
      paymentType: 'crypto',
      escrowId: response.data.escrowId,
      transactionHash: response.data.transactionHash
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### 7.4 Update User Service for Wallet Address

Add migration to `/Users/mahesh/Work/tulifo-gig-backend/apps/user-service`:

```sql
-- Add wallet address columns
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(42);
ALTER TABLE users ADD COLUMN wallet_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN wallet_linked_at TIMESTAMP;
```

### 7.5 Database Schema for Blockchain Transactions

Create in main project database:

```sql
CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  escrow_id VARCHAR(66),
  transaction_hash VARCHAR(66),
  tx_type VARCHAR(20) CHECK (tx_type IN ('escrow_create', 'release', 'refund', 'nft_mint', 'rating')),
  amount DECIMAL(18, 6),
  status VARCHAR(20) DEFAULT 'pending',
  network VARCHAR(20) DEFAULT 'polygon',
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE INDEX idx_blockchain_tx_booking ON blockchain_transactions(booking_id);
CREATE INDEX idx_blockchain_tx_escrow ON blockchain_transactions(escrow_id);
```

### 7.6 Verification Checkpoint ✅

- [ ] Blockchain service copied to main project
- [ ] Payment service integration added
- [ ] User service wallet columns added
- [ ] Blockchain transactions table created

---

## Phase 8: Testnet Deployment (Day 7-10)

### 8.1 Get Sepolia Testnet ETH

1. Visit [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address
3. Request test ETH

### 8.2 Configure Sepolia Deployment

Update `.env`:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_sepolia_wallet_private_key
```

### 8.3 Deploy to Sepolia

```bash
cd /Users/mahesh/Work/tulifo-gig-backend/apps/blockchain-service
pnpm run deploy:sepolia
```

### 8.4 Verification Checkpoint ✅

- [ ] Sepolia ETH received
- [ ] Contracts deployed to Sepolia
- [ ] Contract addresses verified on Etherscan

---

## Summary: Quick Start Commands

```bash
# ===== ONE-TIME SETUP =====
cd /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service
pnpm install
pnpm run compile

# ===== EACH DEV SESSION =====
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts (first time only)
pnpm run deploy:local

# Terminal 3: Start backend service
pnpm run dev

# ===== TESTING =====
pnpm run test

# ===== API TESTING =====
curl http://localhost:3016/health
```

---

## File Structure Reference

```
/Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service/
├── contracts/                    # Solidity smart contracts
│   ├── TulifoEscrow.sol         # ✅ ERC-20 escrow
│   ├── TulifoNFT.sol            # ✅ Skill certificates
│   ├── TulifoReputation.sol     # ✅ On-chain ratings
│   └── TulifoUSD.sol            # ✅ Test stablecoin
├── src/
│   ├── index.ts                  # Express server entry
│   ├── routes/
│   │   ├── escrow.routes.ts     # Escrow API endpoints
│   │   ├── nft.routes.ts        # NFT API endpoints
│   │   ├── reputation.routes.ts # Reputation API endpoints
│   │   └── stripe-crypto.routes.ts  # 🆕 Stripe Crypto Onramp
│   └── services/
│       ├── web3.service.ts      # Blockchain connection
│       ├── escrow.service.ts    # Escrow business logic
│       ├── nft.service.ts       # NFT business logic
│       └── reputation.service.ts # Reputation business logic
├── test/                         # Smart contract tests
├── scripts/
│   └── deploy.ts                 # Deployment script
├── hardhat.config.ts             # Hardhat configuration
├── package.json
└── .env                          # Environment variables
```

---

## Troubleshooting

### Issue: "Contract not deployed"
**Solution:** Make sure Hardhat node is running and contracts are deployed:
```bash
npx hardhat node  # Terminal 1
pnpm run deploy:local  # Terminal 2
```

### Issue: "Transaction reverted"
**Solution:** Check if you have enough test tokens:
```bash
# Mint test TUSD tokens using the faucet function
curl -X POST http://localhost:3016/api/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "amount": "1000"}'
```

### Issue: "Insufficient gas"
**Solution:** Using local Hardhat network with default accounts should have 10000 ETH each.

---

## Next Steps After Implementation

1. ✅ Complete all phases in scratch directory
2. ✅ Run all tests successfully
3. ✅ Copy to main tulifo-gig-backend project
4. 🔜 Build frontend wallet connection (MetaMask)
5. 🔜 Deploy to Polygon testnet
6. 🔜 Production deployment

---

**Document Status:** Ready for Implementation  
**Estimated Time:** 7-10 days  
**Dependencies:** Node.js 18+, pnpm, Stripe account with Crypto enabled
