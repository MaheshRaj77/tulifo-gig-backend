# TULIFO BLOCKCHAIN - COMPLETE STUDENT MVP GUIDE
## Backend + Frontend Implementation with Full Checklist

**Version:** 1.0  
**Date:** February 1, 2026  
**Timeline:** 2-3 weeks implementation  
**Cost:** $0 (completely FREE)  
**Status:** Ready for students & MVPs  

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start-5-minutes)
2. [System Architecture](#system-architecture)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Smart Contracts](#smart-contracts)
6. [Integration Points](#integration-points)
7. [Testing & Validation](#testing--validation)
8. [Deployment](#deployment)
9. [Complete Backend Checklist](#complete-backend-checklist)
10. [Complete Frontend Checklist](#complete-frontend-checklist)
11. [Full Deployment Checklist](#full-deployment-checklist)

---

## Quick Start (5 minutes)

### What You'll Build

```
CLIENT (Web)                 WORKER (Web)
    │                            │
    └────────────┬───────────────┘
                 │
          ┌──────▼──────┐
          │  MetaMask   │ (Wallet Connection)
          └──────┬──────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
   Escrow       NFT      Reputation
 (Payment)  (Certificate) (Score)
      │          │          │
      └──────────┼──────────┘
                 │
        ┌────────▼────────┐
        │  Blockchain     │
        │  Service (3016) │
        └────────┬────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
   Ethereum    Polygon    Testnet
   (Mainnet)  (Fast)     (Learning)
```

### Prerequisites (Already Installed)

```bash
✅ Node.js 18+
✅ Docker & Docker Compose
✅ Git
✅ VS Code (optional)
```

### One-Time Setup (3 commands)

```bash
# 1. Install blockchain tools
cd /Users/mahesh/Work/tulifo-gig-backend/apps
mkdir blockchain-service && cd blockchain-service
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers web3 dotenv axios

# 2. Initialize Hardhat
npx hardhat
# Choose: "Create a basic sample project"

# 3. You're done! ✅
```

---

## System Architecture

### How Blockchain Fits Into Tulifo

```
CURRENT ARCHITECTURE:
┌─────────────────────────────────────────────────┐
│  Existing Services (14 microservices)           │
│  ✅ auth-service (3001)                         │
│  ✅ user-service (3002)                         │
│  ✅ payment-service (3004) ← Add crypto option │
│  ✅ escrow-service (3012) ← Add blockchain     │
│  ✅ review-service (3014) ← Add on-chain       │
│  ... and 9 more services                        │
└─────────────────────────────────────────────────┘

NEW ADDITION:
┌──────────────────────────────────────────────┐
│  blockchain-service (3016) - NEW             │
│  ┌──────────────────────────────────────────┐│
│  │ Smart Contracts Layer                    ││
│  │ - TulifoEscrow.sol                       ││
│  │ - TulifoNFT.sol                          ││
│  │ - TulifoReputation.sol                   ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ Web3 Services                            ││
│  │ - Wallet integration (MetaMask)          ││
│  │ - Contract interactions                  ││
│  │ - Transaction tracking                   ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘

BLOCKCHAIN NETWORKS:
┌──────────────────────┐
│ Local Hardhat Node   │ (Development)
│ (Free, Instant)      │
└──────────────────────┘
         │
┌──────────────────────┐
│ Sepolia Testnet      │ (Testing with real chains)
│ (Free ETH Faucet)    │
└──────────────────────┘
         │
┌──────────────────────┐
│ Ethereum Mainnet     │ (Production - Later)
│ (Real money - Future)│
└──────────────────────┘
```

---

## Backend Setup

### Step 1: Create Blockchain Service Package

```bash
# Navigate to apps folder
cd /Users/mahesh/Work/tulifo-gig-backend/apps

# Create blockchain service
mkdir blockchain-service
cd blockchain-service

# Initialize as Node.js package
npm init -y

# Install dependencies (all free, open-source)
npm install --save-dev \
  hardhat \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-ethers \
  ethers

npm install \
  express \
  axios \
  dotenv \
  web3 \
  typescript \
  ts-node

# Initialize Hardhat
npx hardhat
```

### Step 2: Project Structure

```
apps/blockchain-service/
├── contracts/                    # Smart contracts (Solidity)
│   ├── TulifoEscrow.sol         # Payment escrow
│   ├── TulifoNFT.sol            # NFT certificates
│   └── TulifoReputation.sol     # Reputation scores
├── scripts/
│   ├── deploy.ts                # Local deployment
│   └── deploy-testnet.ts        # Testnet deployment
├── test/
│   ├── escrow.test.ts           # Escrow tests
│   ├── nft.test.ts              # NFT tests
│   └── reputation.test.ts       # Reputation tests
├── src/
│   ├── index.ts                 # Express server
│   ├── services/
│   │   ├── web3.service.ts      # Web3 provider
│   │   ├── escrow.service.ts    # Escrow logic
│   │   ├── nft.service.ts       # NFT minting
│   │   └── reputation.service.ts# Reputation logic
│   ├── routes/
│   │   ├── escrow.routes.ts     # Escrow API
│   │   ├── nft.routes.ts        # NFT API
│   │   └── reputation.routes.ts # Reputation API
│   ├── middleware/
│   │   └── auth.middleware.ts   # Auth check
│   └── config/
│       └── blockchain.config.ts # Config
├── hardhat.config.ts            # Hardhat configuration
├── .env.example                 # Environment template
└── package.json
```

### Step 3: Hardhat Configuration

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: ["0x0000000000000000000000000000000000000000000000000000000000000000"]
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
```

### Step 4: Environment File

```bash
# .env
# Network
RPC_URL=http://localhost:8545
CHAIN_ID=31337

# Testnet (Get free from https://sepoliafaucet.com)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...your-private-key...

# Deployed contracts (after deployment)
ESCROW_ADDRESS=0x...
NFT_ADDRESS=0x...
REPUTATION_ADDRESS=0x...

# Server
PORT=3016
NODE_ENV=development
```

### Step 5: Express Server Setup

```typescript
// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import escrowRoutes from './routes/escrow.routes';
import nftRoutes from './routes/nft.routes';
import reputationRoutes from './routes/reputation.routes';
import Web3Service from './services/web3.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3016;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'blockchain-service',
    network: process.env.CHAIN_ID
  });
});

// Routes
app.use('/api/v1/escrow', escrowRoutes);
app.use('/api/v1/nft', nftRoutes);
app.use('/api/v1/reputation', reputationRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blockchain service running on http://localhost:${PORT}`);
});
```

---

## Smart Contracts

### Contract 1: Escrow (Simplified for Students)

```solidity
// contracts/TulifoEscrow.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TulifoEscrow
 * @dev Simple escrow for payment holding
 * STUDENT MVP - Deploy on testnet or local blockchain
 */

contract TulifoEscrow {
    
    struct Escrow {
        address client;
        address worker;
        uint256 amount;
        bool released;
        bool exists;
        string bookingId;
    }
    
    mapping(bytes32 => Escrow) public escrows;
    uint256 public escrowCount = 0;
    
    event EscrowCreated(bytes32 indexed id, address indexed client, address indexed worker, uint256 amount);
    event FundsReleased(bytes32 indexed id, address indexed worker, uint256 amount);
    event RefundIssued(bytes32 indexed id, address indexed client, uint256 amount);
    
    /// @dev Create escrow by sending ETH
    function createEscrow(
        address _worker,
        string memory _bookingId
    ) public payable returns (bytes32) {
        require(msg.value > 0, "Must send ETH");
        require(_worker != address(0), "Invalid worker");
        require(_worker != msg.sender, "Cannot escrow yourself");
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(msg.sender, _worker, block.timestamp, escrowCount)
        );
        escrowCount++;
        
        escrows[escrowId] = Escrow({
            client: msg.sender,
            worker: _worker,
            amount: msg.value,
            released: false,
            exists: true,
            bookingId: _bookingId
        });
        
        emit EscrowCreated(escrowId, msg.sender, _worker, msg.value);
        return escrowId;
    }
    
    /// @dev Release payment to worker (client only)
    function releaseFunds(bytes32 _escrowId) public {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.exists, "Escrow not found");
        require(msg.sender == escrow.client, "Only client can release");
        require(!escrow.released, "Already released");
        
        escrow.released = true;
        
        (bool success, ) = escrow.worker.call{value: escrow.amount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(_escrowId, escrow.worker, escrow.amount);
    }
    
    /// @dev Refund to client (worker can refund)
    function refundClient(bytes32 _escrowId) public {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.exists, "Escrow not found");
        require(msg.sender == escrow.worker, "Only worker can refund");
        require(!escrow.released, "Already released");
        
        (bool success, ) = escrow.client.call{value: escrow.amount}("");
        require(success, "Refund failed");
        
        emit RefundIssued(_escrowId, escrow.client, escrow.amount);
    }
    
    /// @dev Get escrow details
    function getEscrow(bytes32 _escrowId) public view returns (Escrow memory) {
        return escrows[_escrowId];
    }
}
```

### Contract 2: NFT Certificates

```solidity
// contracts/TulifoNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TulifoNFT {
    
    struct Certificate {
        string skillName;
        uint256 issuedAt;
        string issuer;
        bool exists;
    }
    
    address public owner;
    uint256 public tokenId = 0;
    
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public ownerTokens;
    
    event CertificateIssued(uint256 indexed tokenId, address indexed recipient, string skill);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /// @dev Issue certificate to user
    function issueCertificate(
        address _recipient,
        string memory _skill,
        string memory _issuer
    ) public onlyOwner returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        
        uint256 newTokenId = tokenId;
        tokenId++;
        
        certificates[newTokenId] = Certificate({
            skillName: _skill,
            issuedAt: block.timestamp,
            issuer: _issuer,
            exists: true
        });
        
        ownerTokens[_recipient].push(newTokenId);
        
        emit CertificateIssued(newTokenId, _recipient, _skill);
        return newTokenId;
    }
    
    /// @dev Get certificate
    function getCertificate(uint256 _tokenId) public view returns (Certificate memory) {
        require(certificates[_tokenId].exists, "Certificate not found");
        return certificates[_tokenId];
    }
    
    /// @dev Get all certificates for address
    function getCertificatesByAddress(address _owner) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return ownerTokens[_owner];
    }
}
```

### Contract 3: Reputation

```solidity
// contracts/TulifoReputation.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TulifoReputation {
    
    struct ReputationScore {
        uint256 totalRating;
        uint256 ratingCount;
        uint256 jobsCompleted;
        bool exists;
    }
    
    address public owner;
    mapping(address => ReputationScore) public reputations;
    
    event RatingAdded(address indexed user, uint256 rating, uint256 averageRating);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /// @dev Add rating (1-5 stars)
    function addRating(address _user, uint256 _rating) public onlyOwner {
        require(_user != address(0), "Invalid user");
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        
        if (!reputations[_user].exists) {
            reputations[_user].exists = true;
        }
        
        reputations[_user].totalRating += _rating;
        reputations[_user].ratingCount += 1;
        reputations[_user].jobsCompleted += 1;
        
        emit RatingAdded(_user, _rating, getAverageRating(_user));
    }
    
    /// @dev Get average rating
    function getAverageRating(address _user) public view returns (uint256) {
        if (reputations[_user].ratingCount == 0) return 0;
        return (reputations[_user].totalRating * 100) / reputations[_user].ratingCount;
    }
    
    /// @dev Get full reputation
    function getReputation(address _user) 
        public 
        view 
        returns (ReputationScore memory) 
    {
        return reputations[_user];
    }
}
```

---

## Backend Services

### Web3 Service

```typescript
// src/services/web3.service.ts
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

class Web3Service {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  public escrowContract: ethers.Contract;
  public nftContract: ethers.Contract;
  public reputationContract: ethers.Contract;
  
  constructor() {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const privateKey = process.env.PRIVATE_KEY || 
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    this.initializeContracts();
  }
  
  private initializeContracts() {
    try {
      const addresses = JSON.parse(
        fs.readFileSync('./contract-addresses.json', 'utf-8')
      );
      
      const escrowABI = require('../abi/TulifoEscrow.json');
      const nftABI = require('../abi/TulifoNFT.json');
      const reputationABI = require('../abi/TulifoReputation.json');
      
      this.escrowContract = new ethers.Contract(
        addresses.escrow,
        escrowABI,
        this.wallet
      );
      
      this.nftContract = new ethers.Contract(
        addresses.nft,
        nftABI,
        this.wallet
      );
      
      this.reputationContract = new ethers.Contract(
        addresses.reputation,
        reputationABI,
        this.wallet
      );
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
    }
  }
  
  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }
  
  async isConnected(): Promise<boolean> {
    try {
      await this.provider.getNetwork();
      return true;
    } catch {
      return false;
    }
  }
}

export default new Web3Service();
```

### Escrow Service

```typescript
// src/services/escrow.service.ts
import { ethers } from 'ethers';
import Web3Service from './web3.service';

interface CreateEscrowRequest {
  bookingId: string;
  clientAddress: string;
  workerAddress: string;
  amount: string; // In ETH
}

class EscrowService {
  
  async createEscrow(request: CreateEscrowRequest): Promise<{
    escrowId: string;
    transactionHash: string;
    amount: string;
  }> {
    try {
      const amountInWei = ethers.parseEther(request.amount);
      
      const tx = await Web3Service.escrowContract.createEscrow(
        request.workerAddress,
        request.bookingId,
        { value: amountInWei }
      );
      
      const receipt = await tx.wait();
      
      // Extract escrow ID from event
      const event = receipt?.logs
        ?.map(log => Web3Service.escrowContract.interface.parseLog(log))
        ?.find(e => e?.name === 'EscrowCreated');
      
      return {
        escrowId: event?.args?.[0] || '',
        transactionHash: tx.hash,
        amount: request.amount
      };
    } catch (error) {
      console.error('Error creating escrow:', error);
      throw error;
    }
  }
  
  async releasePayment(escrowId: string): Promise<{
    transactionHash: string;
    success: boolean;
  }> {
    try {
      const tx = await Web3Service.escrowContract.releaseFunds(escrowId);
      await tx.wait();
      
      return {
        transactionHash: tx.hash,
        success: true
      };
    } catch (error) {
      console.error('Error releasing payment:', error);
      throw error;
    }
  }
  
  async getEscrowStatus(escrowId: string): Promise<any> {
    try {
      const escrow = await Web3Service.escrowContract.getEscrow(escrowId);
      
      return {
        client: escrow.client,
        worker: escrow.worker,
        amount: ethers.formatEther(escrow.amount),
        released: escrow.released,
        bookingId: escrow.bookingId
      };
    } catch (error) {
      console.error('Error getting escrow status:', error);
      throw error;
    }
  }
}

export default new EscrowService();
```

### Routes

```typescript
// src/routes/escrow.routes.ts
import express from 'express';
import EscrowService from '../services/escrow.service';

const router = express.Router();

// Create escrow
router.post('/create', async (req, res) => {
  try {
    const { bookingId, clientAddress, workerAddress, amount } = req.body;
    
    if (!bookingId || !clientAddress || !workerAddress || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const result = await EscrowService.createEscrow({
      bookingId,
      clientAddress,
      workerAddress,
      amount
    });
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Release payment
router.post('/release', async (req, res) => {
  try {
    const { escrowId } = req.body;
    
    if (!escrowId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing escrowId' 
      });
    }
    
    const result = await EscrowService.releasePayment(escrowId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get escrow status
router.get('/:escrowId/status', async (req, res) => {
  try {
    const status = await EscrowService.getEscrowStatus(req.params.escrowId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## Frontend Setup

### Step 1: Install Dependencies

```bash
# In your React/Next.js frontend
npm install ethers web3 @web3-react/core @web3-react/injected-connector
```

### Step 2: Web3 Provider Context

```typescript
// components/Web3Provider.tsx
import React, { createContext, useContext, useState } from 'react';
import { ethers } from 'ethers';

interface Web3Context {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getBalance: () => Promise<string>;
}

const Web3Context = createContext<Web3Context | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
  };

  const getBalance = async () => {
    if (!provider || !account) return '0';
    const balance = await provider.getBalance(account);
    return ethers.formatEther(balance);
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        isConnected: !!account,
        connectWallet,
        disconnectWallet,
        getBalance
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used inside Web3Provider');
  }
  return context;
}
```

### Step 3: Escrow Component

```typescript
// components/CryptoPayment.tsx
import React, { useState } from 'react';
import { useWeb3 } from './Web3Provider';
import axios from 'axios';

interface CryptoPaymentProps {
  bookingId: string;
  workerAddress: string;
  amount: number; // In ETH
  onSuccess: () => void;
}

export function CryptoPayment({
  bookingId,
  workerAddress,
  amount,
  onSuccess
}: CryptoPaymentProps) {
  const { account, provider } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [escrowId, setEscrowId] = useState('');

  const handlePayment = async () => {
    if (!account || !provider) {
      setError('Please connect wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call backend blockchain service
      const response = await axios.post(
        'http://localhost:3016/api/v1/escrow/create',
        {
          bookingId,
          clientAddress: account,
          workerAddress,
          amount: amount.toString()
        }
      );

      setEscrowId(response.data.data.escrowId);
      alert('✅ Escrow created! Transaction: ' + response.data.data.transactionHash);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Pay with Crypto</h2>

      {!account ? (
        <button onClick={() => window.location.href = '/connect-wallet'}>
          Connect MetaMask
        </button>
      ) : (
        <>
          <div>
            <p>Account: {account.slice(0, 6)}...{account.slice(-4)}</p>
            <p>Amount: {amount} ETH</p>
            <p>Worker: {workerAddress.slice(0, 6)}...{workerAddress.slice(-4)}</p>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'Create Escrow'}
          </button>

          {escrowId && (
            <p style={{ color: 'green' }}>
              ✅ Escrow ID: {escrowId.slice(0, 10)}...
            </p>
          )}

          {error && <p style={{ color: 'red' }}>❌ {error}</p>}
        </>
      )}
    </div>
  );
}
```

### Step 4: NFT Display Component

```typescript
// components/NFTCertificates.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWeb3 } from './Web3Provider';

export function NFTCertificates() {
  const { account } = useWeb3();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) return;

    const fetchCertificates = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3016/api/v1/nft/certificates/${account}`
        );
        setCertificates(response.data.data);
      } catch (error) {
        console.error('Failed to fetch certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [account]);

  if (!account) return <p>Connect wallet to view certificates</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Certificates</h2>
      {certificates.length === 0 ? (
        <p>No certificates yet</p>
      ) : (
        <div>
          {certificates.map((cert: any, idx: number) => (
            <div key={idx} style={{ padding: '10px', border: '1px solid #ddd', marginBottom: '10px' }}>
              <h4>🏆 {cert.skillName}</h4>
              <p>Issuer: {cert.issuer}</p>
              <p>Issued: {new Date(cert.issuedAt * 1000).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Integration Points

### How to Connect Backend Blockchain Service with Existing Services

```typescript
// In payment-service (existing)
import axios from 'axios';

export async function processBlockchainPayment(
  bookingId: string,
  clientId: string,
  workerId: string,
  amount: number
) {
  try {
    // Get wallet addresses from user service
    const clientWallet = await getUserWallet(clientId);
    const workerWallet = await getUserWallet(workerId);

    // Call blockchain service
    const response = await axios.post(
      'http://localhost:3016/api/v1/escrow/create',
      {
        bookingId,
        clientAddress: clientWallet,
        workerAddress: workerWallet,
        amount: amount.toString()
      }
    );

    // Store transaction in database
    await saveBlockchainTransaction({
      bookingId,
      escrowId: response.data.data.escrowId,
      transactionHash: response.data.data.transactionHash,
      amount,
      status: 'created'
    });

    return response.data.data;
  } catch (error) {
    console.error('Blockchain payment failed:', error);
    throw error;
  }
}
```

---

## Testing & Validation

### Run Local Tests (FREE - No Gas Fees)

```bash
# Deploy locally
npx hardhat node

# In another terminal, run tests
npx hardhat test

# Output:
# TulifoEscrow
#   ✓ Should create escrow (250ms)
#   ✓ Should release funds (180ms)
#   ✓ Should refund client (220ms)
#   
#   3 passing (2s)
```

### Test Files

```typescript
// test/escrow.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TulifoEscrow", function () {
  let escrow: any;
  let client: any;
  let worker: any;

  beforeEach(async function () {
    [client, worker] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("TulifoEscrow");
    escrow = await Escrow.deploy();
  });

  it("Should create escrow with ETH", async function () {
    const tx = await escrow
      .connect(client)
      .createEscrow(worker.address, "booking-123", {
        value: ethers.parseEther("1")
      });

    const receipt = await tx.wait();
    expect(receipt?.status).to.equal(1);
  });

  it("Should release funds to worker", async function () {
    const tx1 = await escrow
      .connect(client)
      .createEscrow(worker.address, "booking-123", {
        value: ethers.parseEther("1")
      });

    const receipt1 = await tx1.wait();
    const events = receipt1?.logs?.map(log => 
      escrow.interface.parseLog(log)
    );
    const escrowId = events?.[0]?.args?.[0];

    const balanceBefore = await ethers.provider.getBalance(worker.address);

    await escrow.connect(client).releaseFunds(escrowId);

    const balanceAfter = await ethers.provider.getBalance(worker.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});
```

---

## Deployment

### Step 1: Deploy to Local Blockchain

```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Output:
# ✅ Escrow deployed to: 0x5FbDB2...
# ✅ NFT deployed to: 0x7aB3e4...
# ✅ Reputation deployed to: 0xB1c2d3...
```

### Step 2: Update Environment

```bash
# Copy addresses to .env
ESCROW_ADDRESS=0x5FbDB2...
NFT_ADDRESS=0x7aB3e4...
REPUTATION_ADDRESS=0xB1c2d3...
```

### Step 3: Start Services

```bash
# Terminal 3: Start blockchain service
cd apps/blockchain-service
npm run dev

# Terminal 4: Start frontend (if separate)
cd apps/frontend
npm start
```

### Step 4: Deploy to Testnet (Free)

```bash
# Get free Sepolia ETH
# Visit: https://sepoliafaucet.com
# Paste your wallet address, claim 0.5 ETH

# Update .env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=0x...your-private-key...

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# View on Etherscan
# https://sepolia.etherscan.io/address/0x...contract-address...
```

---

## Complete Backend Checklist

### Phase 1: Setup ✅

- [ ] Create `apps/blockchain-service` directory
- [ ] Initialize Node.js project (`npm init -y`)
- [ ] Install Hardhat (`npm install --save-dev hardhat`)
- [ ] Initialize Hardhat project (`npx hardhat`)
- [ ] Install dependencies (`npm install ethers express axios dotenv`)
- [ ] Create `hardhat.config.ts` file
- [ ] Create `.env.example` file
- [ ] Copy `.env.example` to `.env`

### Phase 2: Smart Contracts ✅

- [ ] Create `contracts/TulifoEscrow.sol`
- [ ] Create `contracts/TulifoNFT.sol`
- [ ] Create `contracts/TulifoReputation.sol`
- [ ] Compile contracts (`npx hardhat compile`)
- [ ] Check for compilation errors
- [ ] Generate ABIs in `artifacts/` folder

### Phase 3: Testing ✅

- [ ] Create `test/escrow.test.ts`
- [ ] Create `test/nft.test.ts`
- [ ] Create `test/reputation.test.ts`
- [ ] Run tests (`npx hardhat test`)
- [ ] All tests passing ✅

### Phase 4: Deployment ✅

- [ ] Create `scripts/deploy.ts`
- [ ] Deploy to localhost (`npx hardhat node` + `npx hardhat run scripts/deploy.ts --network localhost`)
- [ ] Save contract addresses to `.env`
- [ ] Verify contracts deployed (`etherscan.io` or `localhost:8545`)

### Phase 5: Backend Services ✅

- [ ] Create `src/services/web3.service.ts`
- [ ] Create `src/services/escrow.service.ts`
- [ ] Create `src/services/nft.service.ts`
- [ ] Create `src/services/reputation.service.ts`
- [ ] Create `src/routes/escrow.routes.ts`
- [ ] Create `src/routes/nft.routes.ts`
- [ ] Create `src/routes/reputation.routes.ts`
- [ ] Create `src/index.ts` (Express server)
- [ ] Test all routes with Postman/curl
- [ ] All routes return 200 ✅

### Phase 6: Integration ✅

- [ ] Add blockchain routes to existing `payment-service`
- [ ] Add blockchain routes to `escrow-service`
- [ ] Update database schema to store blockchain transactions
- [ ] Add wallet address to `user` model
- [ ] Test end-to-end payment flow
- [ ] Verify transaction tracking

### Phase 7: Documentation ✅

- [ ] Document all API endpoints
- [ ] Create README with setup instructions
- [ ] Add example requests/responses
- [ ] Document contract functions
- [ ] Create deployment guide

---

## Complete Frontend Checklist

### Phase 1: Setup ✅

- [ ] Install Web3 libraries (`npm install ethers @web3-react/core`)
- [ ] Install MetaMask extension in browser
- [ ] Import ethers in your project
- [ ] Create `.env.local` with backend URLs

### Phase 2: Web3 Context ✅

- [ ] Create `components/Web3Provider.tsx`
- [ ] Create `hooks/useWeb3.ts`
- [ ] Wrap app with Web3Provider
- [ ] Test wallet connection locally
- [ ] Verify account displays correctly

### Phase 3: Components ✅

- [ ] Create `components/ConnectWallet.tsx` - MetaMask connection
- [ ] Create `components/CryptoPayment.tsx` - Payment UI
- [ ] Create `components/NFTCertificates.tsx` - Certificate display
- [ ] Create `components/ReputationScore.tsx` - Reputation display
- [ ] Create `components/TransactionStatus.tsx` - TX tracking
- [ ] Test all components in isolation

### Phase 4: Integration ✅

- [ ] Integrate CryptoPayment into booking flow
- [ ] Show NFT certificates on worker profile
- [ ] Display reputation score on profile
- [ ] Add option to pay with crypto vs traditional
- [ ] Test complete payment flow
- [ ] Verify blockchain transaction appears

### Phase 5: Error Handling ✅

- [ ] Handle wallet not connected
- [ ] Handle insufficient balance
- [ ] Handle transaction failure
- [ ] Display user-friendly error messages
- [ ] Add retry logic
- [ ] Test all error scenarios

### Phase 6: Testing ✅

- [ ] Test on localhost (local blockchain)
- [ ] Test on Sepolia testnet
- [ ] Test MetaMask interactions
- [ ] Test transaction status updates
- [ ] Test NFT display
- [ ] Test reputation updates

### Phase 7: UI/UX ✅

- [ ] Make crypto payment UI consistent with platform
- [ ] Add loading states
- [ ] Add success/error notifications
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility (a11y) checks
- [ ] Dark mode support

---

## Full Deployment Checklist

### Pre-Deployment ✅

- [ ] All backend tests passing
- [ ] All frontend tests passing
- [ ] No console errors
- [ ] No console warnings
- [ ] Performance acceptable (<500ms responses)
- [ ] Security review completed
- [ ] Code review completed

### Backend Deployment ✅

- [ ] Contracts deployed to testnet (Sepolia)
- [ ] Contract addresses saved in `.env`
- [ ] Backend service running (`http://localhost:3016`)
- [ ] Health check responding (`/health` returns 200)
- [ ] All API endpoints tested with curl
- [ ] Error handling working correctly
- [ ] Logging enabled and working

### Frontend Deployment ✅

- [ ] Frontend can connect to backend
- [ ] MetaMask connection working
- [ ] All components rendering
- [ ] All API calls successful
- [ ] No CORS errors
- [ ] Responsive design verified
- [ ] Browser compatibility verified (Chrome, Firefox, Safari)

### Integration Testing ✅

- [ ] Create test payment flow start-to-finish
- [ ] Verify transaction on Etherscan
- [ ] Verify NFT issued on-chain
- [ ] Verify reputation updated on-chain
- [ ] Verify database updated
- [ ] Test user receives notification
- [ ] Test worker receives payment

### Monitoring ✅

- [ ] Set up error logging (Sentry)
- [ ] Set up performance monitoring (Datadog)
- [ ] Set up uptime monitoring (Pingdom)
- [ ] Create alert rules for errors
- [ ] Create alert rules for high latency
- [ ] Create runbook for incident response

### Documentation ✅

- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Troubleshooting guide complete
- [ ] User guide for crypto payments
- [ ] Developer guide for integration
- [ ] Video tutorial (optional)

### Security ✅

- [ ] Private keys secured (not in repo)
- [ ] Environment variables not exposed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection enabled

---

## Quick Reference

### Useful Commands

```bash
# Start local blockchain
npx hardhat node

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to localhost
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Start backend service
npm run dev

# Check contract on Etherscan
# https://sepolia.etherscan.io/address/0x...

# Get free testnet ETH
# https://sepoliafaucet.com
```

### Useful URLs

```
Local Blockchain: http://localhost:8545
Backend Service: http://localhost:3016
Hardhat Node: http://localhost:8545
Health Check: http://localhost:3016/health

Sepolia Explorer: https://sepolia.etherscan.io
Sepolia Faucet: https://sepoliafaucet.com
Infura: https://infura.io (free account)
```

### Cost Breakdown

| Item | Cost | Timeline |
|------|------|----------|
| Local Blockchain (Hardhat) | $0 | Development |
| Testnet ETH (Faucet) | $0 | Testing |
| Smart Contracts (Local) | $0 | Development |
| MetaMask | $0 | Always |
| Infura (Free Tier) | $0 | Testing |
| **Total** | **$0** | **Forever** |

---

## Support & Resources

### Learning Resources

- **Solidity Docs**: https://docs.soliditylang.org/
- **Hardhat Docs**: https://hardhat.org/docs
- **Ethers.js Docs**: https://docs.ethers.org/
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Ethereum Dev Docs**: https://ethereum.org/en/developers/

### Community

- **Stack Exchange**: https://ethereum.stackexchange.com
- **Discord**: Ethereum, Hardhat communities
- **Reddit**: r/ethdev
- **GitHub Discussions**: Various projects

---

## Timeline Summary

| Week | Backend | Frontend | Milestone |
|------|---------|----------|-----------|
| Week 1 | Setup & Contracts | Setup & Context | 🏗️ Foundation |
| Week 2 | Services & Routes | Components | 🔧 Integration |
| Week 3 | Testing & Local Deploy | Testing & Testnet | ✅ MVP Ready |

---

**Status:** ✅ Ready to Start  
**Cost:** $0 (completely free)  
**Difficulty:** Beginner to Intermediate  
**Support:** Community + Documentation

---

**Last Updated:** February 1, 2026  
**Next Update:** Add mainnet deployment guide  
**Document Owner:** Development Team
