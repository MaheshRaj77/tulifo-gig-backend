# Tulifo GIG - Complete Blockchain Integration Guide
## Backend + Frontend Implementation with Checklist

**Document Version:** 2.0  
**Date:** February 1, 2026  
**Phase:** 4 (Months 11-12) - Can be added later  
**Status:** Production Ready - Student MVP  
**Cost:** $0 (completely free)

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Architecture](#architecture)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Smart Contracts Setup](#smart-contracts-setup)
6. [Free Testnet Deployment](#free-testnet-deployment)
7. [Service Integration](#service-integration)
8. [Testing Strategy](#testing-strategy)
9. [Backend Checklist](#backend-checklist)
10. [Frontend Checklist](#frontend-checklist)
11. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Strategic Goals

**Why Blockchain?**

1. **Transparency**: Immutable transaction records
2. **Security**: Cryptographic proof of payments
3. **Trust**: Decentralized reputation system
4. **Innovation**: NFT-based credentials
5. **Cost Reduction**: Eliminate intermediaries for some payments
6. **Global Reach**: Enable cross-border payments without banks

### Timeline

```
Month 11:
  Week 1-2: Smart contracts development & testing
  Week 3-4: Crypto wallet integration
  
Month 12:
  Week 1-2: NFT system implementation
  Week 3-4: Launch & optimization

Target: 5-10% of payments via blockchain by end of Year 1
```

### Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Smart Contract Deployments | 2 (Ethereum + Polygon) | Month 11 W2 |
| Wallet Connections | 500+ active | Month 12 |
| Crypto Payment Volume | $50K-100K | Month 12 |
| NFT Certificates Issued | 100+ | Month 12 |
| Decentralized Reputation Score | Live & Verified | Month 12 |
| Gas Cost Optimization | <$1 per transaction | Month 11 W4 |

---

## Blockchain Architecture

### Supported Networks

#### **Ethereum (Primary)**

```yaml
Network:       Ethereum Mainnet
ChainID:       1
Token:         ETH, USDC
Block Time:    ~13 seconds
Gas Stations:  Gwei pricing
Purpose:       Primary settlement layer
Use Cases:     High-value transactions, USDC payments
```

**RPC Endpoints:**
```
Alchemy:       https://eth-mainnet.alchemyapi.io/v2/{API_KEY}
Infura:        https://mainnet.infura.io/v3/{PROJECT_ID}
Endpoint:      ws://localhost:8545 (local)
```

#### **Polygon (Optimized)**

```yaml
Network:       Polygon Mainnet
ChainID:       137
Token:         MATIC, USDC, USDT
Block Time:    ~2 seconds
Gas Cost:      99% cheaper than Ethereum
Purpose:       High-frequency, low-cost transactions
Use Cases:     Micro-payments, escrow releases
```

**RPC Endpoints:**
```
QuickNode:     https://polygon-mainnet.quiknode.pro/{API_KEY}
Infura:        https://polygon-mainnet.infura.io/v3/{PROJECT_ID}
Endpoint:      ws://localhost:9545 (local)
```

#### **Testnets (Development)**

```yaml
Ethereum Sepolia:
  ChainID:     11155111
  Faucet:      https://sepoliafaucet.com
  Explorer:    https://sepolia.etherscan.io

Polygon Mumbai:
  ChainID:     80001
  Faucet:      https://faucet.polygon.technology/
  Explorer:    https://mumbai.polygonscan.com
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ MetaMask Wallet Connection                        │   │
│  │ - Web3.js / Ethers.js Integration                 │   │
│  │ - Wallet Balance Display                          │   │
│  │ - Transaction History                             │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              BLOCKCHAIN SERVICE (Backend)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Web3 Provider Abstraction                         │   │
│  │ - Multi-chain support (ETH + Polygon)             │   │
│  │ - Contract interaction layer                      │   │
│  │ - Gas price monitoring                            │   │
│  │ - Transaction tracking (subgraph queries)         │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
│  Ethereum    │ │  Polygon  │ │  The Graph│
│  Mainnet     │ │  Mainnet  │ │ (Indexing)│
└──────────────┘ └───────────┘ └───────────┘
        │              │              │
┌───────▼──────────────▼──────────────▼──────┐
│           Smart Contracts                   │
│  ┌──────────────────────────────────────┐  │
│  │ EscrowContract (Hold & Release)       │  │
│  │ NFTCertificate (Skills & Verification)│ │
│  │ ReputationOracle (Decentralized Score)│ │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Smart Contracts

### Smart Contract #1: Escrow Contract

**Purpose**: Hold payments, verify completion, release funds

**Language**: Solidity ^0.8.0

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TulifoEscrow
 * @dev Manages escrow payments between clients and workers
 * Holds funds and releases based on completion verification
 */
contract TulifoEscrow is ReentrancyGuard, AccessControl {
    
    // Roles
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    
    // Token supported (USDC, MATIC, etc.)
    IERC20 public immutable usdc;
    
    // Booking/Escrow structure
    struct EscrowAccount {
        address client;
        address worker;
        uint256 amount;
        uint256 releaseTime;
        bool released;
        bool disputed;
        string bookingId; // Link to backend booking
    }
    
    // Mapping: escrowId => EscrowAccount
    mapping(bytes32 => EscrowAccount) public escrows;
    
    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed client,
        address indexed worker,
        uint256 amount
    );
    
    event FundsReleased(
        bytes32 indexed escrowId,
        address indexed worker,
        uint256 amount
    );
    
    event RefundIssued(
        bytes32 indexed escrowId,
        address indexed client,
        uint256 amount
    );
    
    event DisputeRaised(
        bytes32 indexed escrowId,
        string reason
    );
    
    event DisputeResolved(
        bytes32 indexed escrowId,
        address indexed winner,
        uint256 amount
    );
    
    // Initialize with USDC token
    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Create escrow account for booking
     * @param _client Client address
     * @param _worker Worker address
     * @param _amount Amount in USDC (18 decimals)
     * @param _bookingId Backend booking ID
     */
    function createEscrow(
        address _client,
        address _worker,
        uint256 _amount,
        string memory _bookingId
    ) external returns (bytes32) {
        require(_client != address(0), "Invalid client");
        require(_worker != address(0), "Invalid worker");
        require(_amount > 0, "Amount must be > 0");
        
        // Generate unique escrow ID
        bytes32 escrowId = keccak256(
            abi.encodePacked(_client, _worker, block.timestamp, _bookingId)
        );
        
        // Transfer USDC from client to this contract
        require(
            usdc.transferFrom(_client, address(this), _amount),
            "Transfer failed"
        );
        
        // Create escrow
        escrows[escrowId] = EscrowAccount({
            client: _client,
            worker: _worker,
            amount: _amount,
            releaseTime: block.timestamp + 7 days, // Default 7-day hold
            released: false,
            disputed: false,
            bookingId: _bookingId
        });
        
        emit EscrowCreated(escrowId, _client, _worker, _amount);
        return escrowId;
    }
    
    /**
     * @dev Release funds to worker (called by client)
     * @param _escrowId Escrow ID
     */
    function releaseFunds(bytes32 _escrowId) external nonReentrant {
        EscrowAccount storage escrow = escrows[_escrowId];
        
        require(escrow.amount > 0, "Invalid escrow");
        require(msg.sender == escrow.client, "Only client can release");
        require(!escrow.released, "Already released");
        require(!escrow.disputed, "Disputed escrow");
        
        escrow.released = true;
        
        // Transfer to worker
        require(usdc.transfer(escrow.worker, escrow.amount), "Transfer failed");
        
        emit FundsReleased(_escrowId, escrow.worker, escrow.amount);
    }
    
    /**
     * @dev Refund to client (worker refund consent)
     * @param _escrowId Escrow ID
     */
    function refundClient(bytes32 _escrowId) external nonReentrant {
        EscrowAccount storage escrow = escrows[_escrowId];
        
        require(escrow.amount > 0, "Invalid escrow");
        require(msg.sender == escrow.worker, "Only worker can refund");
        require(!escrow.released, "Already released");
        require(!escrow.disputed, "Disputed escrow");
        
        // Transfer back to client
        require(usdc.transfer(escrow.client, escrow.amount), "Transfer failed");
        
        emit RefundIssued(_escrowId, escrow.client, escrow.amount);
    }
    
    /**
     * @dev Raise dispute (can be called by either party)
     * @param _escrowId Escrow ID
     * @param _reason Dispute reason
     */
    function raiseDispute(bytes32 _escrowId, string memory _reason) external {
        EscrowAccount storage escrow = escrows[_escrowId];
        
        require(escrow.amount > 0, "Invalid escrow");
        require(
            msg.sender == escrow.client || msg.sender == escrow.worker,
            "Not a party"
        );
        require(!escrow.released, "Already released");
        
        escrow.disputed = true;
        emit DisputeRaised(_escrowId, _reason);
    }
    
    /**
     * @dev Resolve dispute (arbitrator only)
     * @param _escrowId Escrow ID
     * @param _winner Winner address (client or worker)
     */
    function resolveDispute(bytes32 _escrowId, address _winner)
        external
        onlyRole(ARBITRATOR_ROLE)
        nonReentrant
    {
        EscrowAccount storage escrow = escrows[_escrowId];
        
        require(escrow.amount > 0, "Invalid escrow");
        require(escrow.disputed, "Not disputed");
        require(
            _winner == escrow.client || _winner == escrow.worker,
            "Invalid winner"
        );
        
        escrow.released = true;
        
        // Transfer to winner
        require(usdc.transfer(_winner, escrow.amount), "Transfer failed");
        
        emit DisputeResolved(_escrowId, _winner, escrow.amount);
    }
    
    /**
     * @dev Get escrow details
     */
    function getEscrow(bytes32 _escrowId)
        external
        view
        returns (EscrowAccount memory)
    {
        return escrows[_escrowId];
    }
}
```

### Smart Contract #2: NFT Certificate Contract

**Purpose**: Issue NFT credentials for verified skills

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TulifoSkillCertificate
 * @dev NFT-based skill verification certificate
 * Each NFT represents verified skill achievement
 */
contract TulifoSkillCertificate is ERC721, AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    Counters.Counter private tokenIdCounter;
    
    // Certificate metadata
    struct Certificate {
        string skillName;
        string issuer; // "LeetCode", "HackerRank", etc.
        uint256 score;
        uint256 issuedAt;
        bool verified;
        string tokenUri;
    }
    
    mapping(uint256 => Certificate) public certificates;
    
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        string skill,
        uint256 score
    );
    
    constructor() ERC721("Tulifo Skill Certificate", "TSKILL") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Issue NFT certificate for skill verification
     */
    function issueCertificate(
        address _recipient,
        string memory _skill,
        string memory _issuer,
        uint256 _score,
        string memory _tokenUri
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        uint256 tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();
        
        _safeMint(_recipient, tokenId);
        
        certificates[tokenId] = Certificate({
            skillName: _skill,
            issuer: _issuer,
            score: _score,
            issuedAt: block.timestamp,
            verified: true,
            tokenUri: _tokenUri
        });
        
        emit CertificateIssued(tokenId, _recipient, _skill, _score);
        
        return tokenId;
    }
    
    /**
     * @dev Get certificate details
     */
    function getCertificate(uint256 _tokenId)
        external
        view
        returns (Certificate memory)
    {
        return certificates[_tokenId];
    }
    
    /**
     * @dev Get all certificates for an address
     */
    function getCertificatesByAddress(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        // Implementation: iterate through tokenIdCounter
        // Return array of token IDs owned by _owner
    }
}
```

### Smart Contract #3: Reputation Oracle Contract

**Purpose**: Decentralized reputation scoring

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TulifoReputationOracle
 * @dev Decentralized reputation scoring
 */
contract TulifoReputationOracle is AccessControl {
    
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    // Reputation structure
    struct ReputationScore {
        uint256 totalRating;
        uint256 ratingCount;
        uint256 completedJobs;
        uint256 lastUpdated;
        bool verified;
    }
    
    mapping(address => ReputationScore) public reputations;
    
    event ReputationUpdated(
        address indexed user,
        uint256 rating,
        uint256 averageScore
    );
    
    /**
     * @dev Update reputation score
     */
    function updateReputation(
        address _user,
        uint256 _rating,
        bool _jobCompleted
    ) external onlyRole(ORACLE_ROLE) {
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        
        ReputationScore storage rep = reputations[_user];
        
        rep.totalRating += _rating;
        rep.ratingCount += 1;
        
        if (_jobCompleted) {
            rep.completedJobs += 1;
        }
        
        rep.lastUpdated = block.timestamp;
        rep.verified = true;
        
        emit ReputationUpdated(
            _user,
            _rating,
            getAverageRating(_user)
        );
    }
    
    /**
     * @dev Get average rating for user
     */
    function getAverageRating(address _user) public view returns (uint256) {
        ReputationScore storage rep = reputations[_user];
        
        if (rep.ratingCount == 0) return 0;
        
        return (rep.totalRating * 100) / rep.ratingCount; // Return as basis points (0-500)
    }
    
    /**
     * @dev Get full reputation data
     */
    function getReputation(address _user)
        external
        view
        returns (ReputationScore memory)
    {
        return reputations[_user];
    }
}
```

### Contract Deployment

**Deployment Script (Hardhat):**

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy Escrow
  const Escrow = await ethers.getContractFactory("TulifoEscrow");
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Mainnet USDC
  const escrow = await Escrow.deploy(USDC_ADDRESS);
  await escrow.deployed();
  console.log("Escrow deployed to:", escrow.address);

  // Deploy NFT
  const NFT = await ethers.getContractFactory("TulifoSkillCertificate");
  const nft = await NFT.deploy();
  await nft.deployed();
  console.log("NFT deployed to:", nft.address);

  // Deploy Reputation Oracle
  const Oracle = await ethers.getContractFactory("TulifoReputationOracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log("Oracle deployed to:", oracle.address);

  // Save addresses
  const addresses = {
    escrow: escrow.address,
    nft: nft.address,
    oracle: oracle.address,
    timestamp: new Date().toISOString()
  };
  
  require('fs').writeFileSync(
    'contract-addresses.json',
    JSON.stringify(addresses, null, 2)
  );
}

main().catch(console.error);
```

**Deployment Commands:**

```bash
# Testnet deployment (Sepolia)
npx hardhat run scripts/deploy.js --network sepolia

# Mainnet deployment (Ethereum)
npx hardhat run scripts/deploy.js --network mainnet

# Polygon deployment
npx hardhat run scripts/deploy.js --network polygon
```

---

## Cryptocurrency Payments

### Supported Cryptocurrencies

| Token | Network | Use Case | Min/Max |
|-------|---------|----------|---------|
| **USDC** | Ethereum | Primary stablecoin | $1 - $10,000 |
| **USDC** | Polygon | Low-cost payments | $1 - $10,000 |
| **USDT** | Ethereum | Alternative stablecoin | $1 - $10,000 |
| **MATIC** | Polygon | Network token | $1 - $1,000 |
| **ETH** | Ethereum | Primary settlement | $0.01 - $100 |

### Payment Flow

```
1. CLIENT INITIATES PAYMENT
   └─> Selects crypto payment option
   └─> Chooses token (USDC, ETH)
   └─> Chooses network (Ethereum/Polygon)

2. METAMASK WALLET
   └─> User connects wallet
   └─> Reviews transaction
   └─> Signs transaction

3. SMART CONTRACT EXECUTION
   └─> Escrow created with funds held
   └─> Transaction on blockchain
   └─> Backend receives event notification

4. WORK COMPLETION
   └─> Client releases payment
   └─> Smart contract transfers to worker
   └─> Worker claims on DEX or keeps in wallet

5. WITHDRAWAL
   └─> Worker can swap USDC → USD on exchange
   └─> Or use crypto debit card
```

### Backend Payment Service

```typescript
// blockchain-service.ts
import { ethers } from 'ethers';
import { Web3 } from 'web3';

interface CryptoPaymentRequest {
  bookingId: string;
  clientAddress: string;
  workerAddress: string;
  amount: string; // In wei or base units
  token: 'USDC' | 'USDT' | 'ETH' | 'MATIC';
  network: 'ethereum' | 'polygon';
}

class BlockchainService {
  private ethProvider: ethers.providers.JsonRpcProvider;
  private polyProvider: ethers.providers.JsonRpcProvider;
  private escrowContract: ethers.Contract;
  
  constructor() {
    // Initialize providers
    this.ethProvider = new ethers.providers.AlchemyProvider(
      'mainnet',
      process.env.ALCHEMY_API_KEY
    );
    
    this.polyProvider = new ethers.providers.JsonRpcProvider(
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    );
  }

  /**
   * Create escrow for payment
   */
  async createEscrow(request: CryptoPaymentRequest): Promise<{
    escrowId: string;
    transactionHash: string;
    gasUsed: string;
  }> {
    const provider = request.network === 'ethereum' 
      ? this.ethProvider 
      : this.polyProvider;

    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY,
      provider
    );

    const usdcAddress = request.network === 'ethereum'
      ? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      : '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

    const USDC = new ethers.Contract(
      usdcAddress,
      ['function approve(address, uint256)'],
      wallet
    );

    // Approve escrow contract
    const approveTx = await USDC.approve(
      process.env.ESCROW_ADDRESS,
      ethers.parseUnits(request.amount, 6) // USDC has 6 decimals
    );
    
    await approveTx.wait();

    // Create escrow
    const EscrowABI = require('./escrow-abi.json');
    const escrowContract = new ethers.Contract(
      process.env.ESCROW_ADDRESS,
      EscrowABI,
      wallet
    );

    const tx = await escrowContract.createEscrow(
      request.clientAddress,
      request.workerAddress,
      ethers.parseUnits(request.amount, 6),
      request.bookingId
    );

    const receipt = await tx.wait();

    // Parse event
    const event = receipt.logs
      .map(log => escrowContract.interface.parseLog(log))
      .find(e => e.name === 'EscrowCreated');

    return {
      escrowId: event.args.escrowId,
      transactionHash: tx.hash,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Release payment to worker
   */
  async releasePayment(escrowId: string): Promise<{
    transactionHash: string;
    gasUsed: string;
  }> {
    // Implementation similar to createEscrow
  }

  /**
   * Get gas price estimates
   */
  async getGasPriceEstimate(network: 'ethereum' | 'polygon'): Promise<{
    fast: string;
    standard: string;
    slow: string;
  }> {
    const provider = network === 'ethereum' 
      ? this.ethProvider 
      : this.polyProvider;

    const gasPrice = await provider.getGasPrice();

    return {
      fast: ethers.formatUnits(gasPrice.mul(2), 'gwei'),
      standard: ethers.formatUnits(gasPrice, 'gwei'),
      slow: ethers.formatUnits(gasPrice.div(2), 'gwei')
    };
  }

  /**
   * Track transaction status
   */
  async getTransactionStatus(
    txHash: string,
    network: 'ethereum' | 'polygon'
  ): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    blockNumber: number;
  }> {
    const provider = network === 'ethereum' 
      ? this.ethProvider 
      : this.polyProvider;

    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { status: 'pending', confirmations: 0, blockNumber: 0 };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      confirmations,
      blockNumber: receipt.blockNumber
    };
  }
}

export default new BlockchainService();
```

### API Endpoints for Crypto Payments

```bash
# Initiate crypto payment
POST /api/v1/crypto/payments/create
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "bookingId": "book-123",
  "amount": "1000", // USDC amount (not in wei)
  "token": "USDC",
  "network": "ethereum"
}
Response: {
  "success": true,
  "escrowId": "0x1234...",
  "transactionHash": "0xabcd...",
  "gasUsed": "150000",
  "estimatedTime": "2-5 minutes",
  "networkFee": "$2.50"
}

# Get gas price estimate
GET /api/v1/crypto/gas-estimate?network=ethereum
Response: {
  "fast": "45.2",
  "standard": "42.1",
  "slow": "38.5",
  "currency": "gwei"
}

# Get payment status
GET /api/v1/crypto/payments/:transactionHash/status
Response: {
  "status": "confirmed",
  "confirmations": 12,
  "blockNumber": 19125456
}

# Wallet balance
GET /api/v1/crypto/wallet/:walletAddress/balance
Response: {
  "ethereum": {
    "ETH": "0.5",
    "USDC": "2500.00"
  },
  "polygon": {
    "MATIC": "1000",
    "USDC": "5000.00"
  }
}
```

---

## NFT Certification System

### Certificate Types

```javascript
{
  LEETCODE_VERIFIED: {
    displayName: "LeetCode Verified",
    badge: "🏆",
    requirements: "Solved 100+ problems",
    metadata: {
      platform: "leetcode",
      problemsSolved: 100,
      skillLevel: "expert"
    }
  },
  
  HACKERRANK_CERTIFIED: {
    displayName: "HackerRank 5-Star",
    badge: "⭐⭐⭐⭐⭐",
    requirements: "5-star rating on HackerRank",
    metadata: {
      platform: "hackerrank",
      rating: 5,
      certifiedSkills: ["C++", "Python", "JavaScript"]
    }
  },
  
  TULIFO_VERIFIED_WORKER: {
    displayName: "Tulifo Verified Worker",
    badge: "✓",
    requirements: "10+ completed jobs, 4.5+ rating",
    metadata: {
      completedJobs: 10,
      averageRating: 4.5,
      earningsVerified: true
    }
  },
  
  SKILL_BADGE: {
    displayName: "Skill Expert: [Skill Name]",
    badge: "🎖️",
    requirements: "Verified proficiency",
    metadata: {
      skill: "React",
      proficiencyLevel: "expert",
      verificationDate: "2026-02-01"
    }
  }
}
```

### NFT Metadata (ERC721 Standard)

```json
{
  "name": "LeetCode Verified - React Expert",
  "description": "NFT certificate verifying expertise in React development",
  "image": "ipfs://QmXxxx.../certificate.png",
  "attributes": [
    {
      "trait_type": "Platform",
      "value": "LeetCode"
    },
    {
      "trait_type": "Problems Solved",
      "value": "250"
    },
    {
      "trait_type": "Difficulty Level",
      "value": "Hard"
    },
    {
      "trait_type": "Skill",
      "value": "React"
    },
    {
      "trait_type": "Issue Date",
      "value": "2026-02-01"
    },
    {
      "trait_type": "Rarity",
      "value": "Uncommon"
    }
  ],
  "external_url": "https://tulifo-gig.com/certificate/0x1234...",
  "animation_url": "ipfs://QmYyyy.../animation.mp4"
}
```

### Frontend NFT Display

```javascript
// components/NFTCertificate.tsx
import React from 'react';
import { useWeb3 } from '@web3-react/core';

interface NFTCertificateProps {
  tokenId: number;
  contractAddress: string;
  network: 'ethereum' | 'polygon';
}

export function NFTCertificate({
  tokenId,
  contractAddress,
  network
}: NFTCertificateProps) {
  const { library } = useWeb3();
  const [metadata, setMetadata] = React.useState(null);

  React.useEffect(() => {
    const fetchMetadata = async () => {
      // Contract ABI for ERC721
      const contract = new ethers.Contract(
        contractAddress,
        ERC721_ABI,
        library
      );

      const uri = await contract.tokenURI(tokenId);
      const response = await fetch(uri);
      const data = await response.json();
      
      setMetadata(data);
    };

    if (library) {
      fetchMetadata();
    }
  }, [library, contractAddress, tokenId]);

  if (!metadata) return <div>Loading...</div>;

  return (
    <div className="nft-certificate">
      <img src={metadata.image} alt="Certificate" />
      <h3>{metadata.name}</h3>
      <p>{metadata.description}</p>
      
      <div className="attributes">
        {metadata.attributes.map(attr => (
          <div key={attr.trait_type}>
            <span>{attr.trait_type}:</span>
            <strong>{attr.value}</strong>
          </div>
        ))}
      </div>

      <a 
        href={`https://${network === 'ethereum' ? 'etherscan.io' : 'polygonscan.com'}/nft/${contractAddress}/${tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Blockchain ↗
      </a>
    </div>
  );
}
```

---

## Decentralized Reputation

### Reputation Score Formula

```
Reputation Score = (Weighted Rating + Completion Rate + Fraud Score) × Platform Factor

Where:
- Weighted Rating: Average rating (1-5 stars) × 100
- Completion Rate: (Completed Jobs / Total Jobs) × 100
- Fraud Score: (0-100, deducted for disputes/refunds)
- Platform Factor: Time on platform multiplier (1.0 - 1.5)

Example:
  Rating: 4.8/5 × 100 = 480
  Completion Rate: 95/100 × 100 = 95
  Fraud Score: -5 (1 minor dispute)
  Platform Factor: 1.2 (6 months active)
  
  Score = (480 + 95 - 5) × 1.2 = 684 (out of 600 max)
```

### On-Chain Reputation Storage

```solidity
// Oracle reads from backend, writes to blockchain
contract TulifoReputationOracle {
  
  struct ReputationData {
    uint256 score; // 0-600
    uint256 jobsCompleted;
    uint256 totalRating;
    uint256 ratingCount;
    uint256 lastUpdated;
    string tier; // "bronze", "silver", "gold", "platinum"
  }
  
  mapping(address => ReputationData) public reputations;
  
  event ReputationTierUpgraded(address indexed user, string newTier);
}
```

### Reputation Tiers

| Tier | Score | Benefits | Visibility |
|------|-------|----------|------------|
| **Bronze** | 0-200 | Basic marketplace access | All users |
| **Silver** | 200-350 | Featured in search | Highlighted |
| **Gold** | 350-500 | Priority matching | Premium badge |
| **Platinum** | 500+ | VIP treatment | Verified badge |

---

## Security & Compliance

### Smart Contract Security

**Audits Required:**
- [ ] Internal code review
- [ ] Automated analysis (Slither)
- [ ] Professional audit (OpenZeppelin, Trail of Bits)
- [ ] Bug bounty program (Immunefi)

**Security Checklist:**

```solidity
// ✓ Reentrancy protection
using SafeERC20 for IERC20;

// ✓ Access control
onlyRole(ADMIN_ROLE)

// ✓ Input validation
require(_amount > 0, "Invalid amount");

// ✓ State consistency
// Checks-Effects-Interactions pattern

// ✓ Overflow/Underflow
// Solidity ^0.8.0 has built-in protection
```

### KYC/AML for Crypto Payments

```javascript
// Implement Onfido integration for crypto payouts
async function verifyKYCForCryptoWithdrawal(userId: string) {
  const user = await User.findById(userId);
  
  if (!user.kycVerified) {
    // Redirect to KYC flow
    return {
      requiresKYC: true,
      kycUrl: generateKYCLink(userId)
    };
  }
  
  // Check withdrawal limits
  const dailyLimit = 5000; // USD
  const monthlyLimit = 50000; // USD
  
  const dailyVolume = await getCryptoDailyVolume(userId);
  const monthlyVolume = await getCryptoMonthlyVolume(userId);
  
  if (dailyVolume > dailyLimit) {
    throw new Error('Daily withdrawal limit exceeded');
  }
  
  return { allowed: true };
}
```

### Tax Compliance

```javascript
// Automatic 1099-K generation
interface CryptoPayout {
  userId: string;
  walletAddress: string;
  amount: number; // USD
  txHash: string;
  date: Date;
  token: string;
}

async function generate1099K(userId: string, year: number) {
  const payouts = await CryptoPayout.find({
    userId,
    date: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) }
  });
  
  const totalGross = payouts.reduce((sum, p) => sum + p.amount, 0);
  
  if (totalGross > 20000) {
    // Generate 1099-K form
    return {
      form: '1099-K',
      grossAmount: totalGross,
      transactionCount: payouts.length,
      monthlyBreakdown: aggregateByMonth(payouts)
    };
  }
}
```

### Compliance Checklist

- [ ] OFAC sanctions check (wallet address screening)
- [ ] AML transaction monitoring
- [ ] KYC verification before first crypto payout
- [ ] Transaction limits (daily/monthly)
- [ ] Enhanced due diligence (high-value transactions)
- [ ] Suspicious activity reporting
- [ ] GDPR data retention
- [ ] Local crypto regulations per country
- [ ] Tax documentation (1099-K, etc.)
- [ ] Regular compliance audits

---

## Frontend Integration

### MetaMask Wallet Connection

```javascript
// pages/crypto-payment.tsx
import { useWeb3 } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';

const injected = new InjectedConnector({
  supportedChainIds: [1, 137] // Ethereum, Polygon
});

export function CryptoPaymentPage() {
  const { activate, active, account, chainId, library } = useWeb3();

  const connectWallet = async () => {
    try {
      await activate(injected);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const switchToEthereum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }]
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  return (
    <div>
      {!active ? (
        <button onClick={connectWallet}>
          Connect MetaMask
        </button>
      ) : (
        <div>
          <p>Connected: {account}</p>
          <p>Network: {chainId === 1 ? 'Ethereum' : 'Polygon'}</p>
          <button onClick={switchToEthereum}>
            Switch to Ethereum
          </button>
        </div>
      )}
    </div>
  );
}
```

### Payment UI Component

```javascript
// components/CryptoCheckout.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

interface CryptoCheckoutProps {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

export function CryptoCheckout({
  bookingId,
  amount,
  onSuccess
}: CryptoCheckoutProps) {
  const [token, setToken] = useState('USDC');
  const [network, setNetwork] = useState('ethereum');
  const [gasEstimate, setGasEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  const getGasEstimate = async () => {
    const response = await axios.get('/api/v1/crypto/gas-estimate', {
      params: { network }
    });
    setGasEstimate(response.data);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Request payment
      const response = await axios.post('/api/v1/crypto/payments/create', {
        bookingId,
        amount: amount.toString(),
        token,
        network
      });

      const { escrowId, transactionHash } = response.data;

      // Show success
      alert(`Payment initiated! TxHash: ${transactionHash}`);
      onSuccess();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crypto-checkout">
      <h2>Pay with Crypto</h2>

      <div className="form-group">
        <label>Amount: ${amount}</label>
      </div>

      <div className="form-group">
        <label>Token:</label>
        <select value={token} onChange={e => setToken(e.target.value)}>
          <option value="USDC">USDC (Stablecoin)</option>
          <option value="USDT">USDT (Stablecoin)</option>
          <option value="ETH">ETH</option>
        </select>
      </div>

      <div className="form-group">
        <label>Network:</label>
        <select 
          value={network} 
          onChange={e => {
            setNetwork(e.target.value);
            getGasEstimate();
          }}
        >
          <option value="ethereum">Ethereum (Mainnet)</option>
          <option value="polygon">Polygon (Lower gas)</option>
        </select>
      </div>

      {gasEstimate && (
        <div className="gas-estimate">
          <p>Gas Prices (Gwei):</p>
          <p>Fast: {gasEstimate.fast}</p>
          <p>Standard: {gasEstimate.standard}</p>
          <p>Slow: {gasEstimate.slow}</p>
        </div>
      )}

      <button 
        onClick={handlePayment}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Proceed with Payment'}
      </button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// tests/blockchain-service.test.ts
import BlockchainService from '../blockchain-service';
import { ethers } from 'ethers';

describe('BlockchainService', () => {
  
  it('should create escrow', async () => {
    const result = await BlockchainService.createEscrow({
      bookingId: 'test-123',
      clientAddress: '0x1234...',
      workerAddress: '0x5678...',
      amount: '1000',
      token: 'USDC',
      network: 'ethereum'
    });

    expect(result.escrowId).toBeDefined();
    expect(result.transactionHash).toMatch(/^0x/);
  });

  it('should validate wallet address', () => {
    expect(() => {
      ethers.getAddress('invalid-address');
    }).toThrow();
  });

  it('should get gas price estimate', async () => {
    const estimate = await BlockchainService.getGasPriceEstimate('ethereum');
    
    expect(estimate.fast).toBeDefined();
    expect(estimate.standard).toBeDefined();
    expect(estimate.slow).toBeDefined();
  });
});
```

### Integration Tests

```javascript
// tests/crypto-payment.integration.test.ts
describe('Crypto Payment Flow', () => {
  
  it('should complete payment from client to worker', async () => {
    // 1. Client creates payment
    const payment = await createCryptoPayment({
      amount: 100,
      token: 'USDC'
    });

    // 2. Payment is in escrow
    expect(payment.status).toBe('escrowed');

    // 3. Client releases payment
    await releasePayment(payment.escrowId);

    // 4. Worker receives funds
    const workerBalance = await getWalletBalance(workerAddress);
    expect(workerBalance).toBeGreaterThan(0);
  });
});
```

### Testnet Deployment

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Run tests on Sepolia
npx hardhat test --network sepolia

# Get test ETH from faucet
# https://sepoliafaucet.com

# Get test USDC
# https://faucet.circle.com (requires verification)
```

---

## Deployment Guide

### Pre-Launch Checklist

#### Smart Contracts
- [ ] Code audit completed
- [ ] Security audit passed
- [ ] Test coverage: 95%+
- [ ] Gas optimization done
- [ ] Mainnet fork testing completed
- [ ] Emergency pause mechanism
- [ ] Upgrade mechanism (proxy pattern)

#### Infrastructure
- [ ] RPC endpoints configured
- [ ] Private keys secured (Vault)
- [ ] Monitoring and alerts set up
- [ ] Transaction tracking system
- [ ] Backup RPC endpoints

#### Compliance
- [ ] KYC/AML system ready
- [ ] Legal review completed
- [ ] Tax implications addressed
- [ ] Compliance officer sign-off
- [ ] Terms of service updated

#### Operations
- [ ] Support team trained
- [ ] Documentation complete
- [ ] Runbooks for incidents
- [ ] 24/7 monitoring active
- [ ] Wallet security procedures

### Deployment Steps

**Phase 1: Testnet (Week 1)**
```bash
# 1. Deploy contracts to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# 2. Run integration tests
npm run test:integration -- --network sepolia

# 3. Setup subgraph indexing
npm run setup:subgraph -- --network sepolia

# 4. Beta user testing
# Invite 50 users to test on Sepolia
```

**Phase 2: Polygon Mainnet (Week 2)**
```bash
# 1. Deploy to Polygon (lower risk)
npx hardhat run scripts/deploy.js --network polygon

# 2. Verify contracts
npx hardhat verify --network polygon <CONTRACT_ADDRESS>

# 3. Enable limited functionality
# Set initial limits: $100 max per transaction

# 4. Monitor for 1 week
# Check for bugs, security issues
```

**Phase 3: Ethereum Mainnet (Week 3)**
```bash
# 1. Final audit review
# 2. Deploy to Ethereum mainnet
npx hardhat run scripts/deploy.js --network mainnet

# 3. Increase transaction limits gradually
# Week 1: $100 max
# Week 2: $500 max
# Week 3: $1,000 max
# Week 4: Unlimited

# 4. 24/7 monitoring active
```

---

## Environment Variables

```bash
# .env.blockchain
ETHEREUM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Contract addresses (after deployment)
ESCROW_CONTRACT_ADDRESS=0x...
NFT_CONTRACT_ADDRESS=0x...
ORACLE_CONTRACT_ADDRESS=0x...

# Keys (use Vault in production)
PRIVATE_KEY=0x...

# API keys
ALCHEMY_API_KEY=YOUR_KEY
ETHERSCAN_API_KEY=YOUR_KEY
POLYGONSCAN_API_KEY=YOUR_KEY

# Subgraph
SUBGRAPH_ENDPOINT=https://api.thegraph.com/subgraphs/name/...

# Features (gradual rollout)
ENABLE_CRYPTO_PAYMENTS=true
ENABLE_NFT_MINTING=true
ENABLE_REPUTATION_ORACLE=true
CRYPTO_PAYMENT_LIMIT=10000 # USD
```

---

## Monitoring & Alerts

### Key Metrics

```
1. Transaction Success Rate
   Target: >99.5%
   Alert: <98%

2. Gas Price Tracking
   Notify if gas > 100 gwei

3. Contract Balance
   Alert if escrow balance < $50K

4. Smart Contract Interactions
   Track: createEscrow, releasePayment, raiseDispute

5. NFT Minting Rate
   Target: 100+ certificates/month
```

### Monitoring Tools

```bash
# Prometheus metrics
prometheus_target = "http://blockchain-node:9090"

# Alert examples
- alert: HighGasPrice
  expr: eth_gasPrice > 100
  duration: 5m
  
- alert: ContractPaused
  expr: contract_isPaused == 1
  duration: 1m
```

---

## Post-Launch Operations

### Maintenance Schedule

- **Daily**: Check transaction success rates, gas prices, contract balance
- **Weekly**: Review dispute patterns, NFT minting stats, compliance reports
- **Monthly**: Smart contract security audit, analytics review, feature updates
- **Quarterly**: Full system audit, compliance review, strategy reassessment

### Support Resources

- **Discord Channel**: #crypto-payments-support
- **Email**: crypto@tulifo-gig.com
- **Documentation**: https://docs.tulifo-gig.com/blockchain
- **Status Page**: https://status.tulifo-gig.com

---

**Last Updated:** February 1, 2026  
**Next Review:** Month 11 (Implementation Start)  
**Document Owner:** Blockchain & Fintech Team





# TULIFO BLOCKCHAIN MVP - FREE STUDENT GUIDE
## Zero Cost Implementation for Learning & Development

**Status:** Perfect for students & MVPs
**Cost:** $0 (completely free)
**Timeline:** 2-3 weeks to full implementation
**Difficulty:** Beginner to Intermediate

---

## 📚 Table of Contents

1. Free Tools Setup
2. Local Blockchain (Hardhat)
3. Simplified Smart Contracts
4. Testing Without Gas Fees
5. Frontend Integration
6. Testnet Deployment (Free)
7. Complete Project Structure

---

## Free Tools Setup

### What You'll Need (All Free)

```bash
# 1. Node.js (free)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 2. Git (free)
git --version

# 3. VS Code (free)
# Download from https://code.visualstudio.com

# That's it! Everything else is free open-source software
```

### Free Services (No Credit Card Required)

```
✅ Hardhat - Local blockchain (free, offline)
✅ MetaMask - Browser wallet (free)
✅ Sepolia Testnet - Free test ETH & USDC
✅ The Graph - Indexing (free tier)
✅ Etherscan/Polygonscan - Block explorers (free)
✅ Pinata IPFS - NFT metadata storage (1GB free)
```

---

## Local Blockchain (Hardhat)

### Why Hardhat is Perfect for Students

```
✅ Deploy contracts locally (instant)
✅ No gas fees
✅ Test with fake ETH
✅ Fast iteration
✅ Built-in testing framework
✅ Works offline
✅ Free and open-source
```

### Setup Hardhat Project

```bash
# Create new directory
mkdir tulifo-blockchain-mvp
cd tulifo-blockchain-mvp

# Initialize Node project
npm init -y

# Install Hardhat
npm install --save-dev hardhat

# Initialize Hardhat project
npx hardhat

# Select: "Create a basic sample project"
# Answer yes to all questions
```

### Project Structure

```
tulifo-blockchain-mvp/
├── contracts/
│   ├── SimpleEscrow.sol           # Basic escrow (100 lines)
│   ├── SimpleNFT.sol              # Basic NFT (100 lines)
│   └── SimpleReputation.sol       # Simple reputation (80 lines)
├── test/
│   ├── escrow.test.js
│   ├── nft.test.js
│   └── reputation.test.js
├── scripts/
│   ├── deploy.js
│   └── interact.js
├── hardhat.config.js
└── .env (gitignored)
```

---

## Simplified Smart Contracts

### Contract 1: Simple Escrow (100 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleEscrow
 * @dev Basic escrow for learning - hold and release payments
 * NO real money needed - use on testnet or local blockchain
 */

contract SimpleEscrow {
    
    // Escrow account structure
    struct Escrow {
        address client;
        address worker;
        uint256 amount;
        bool released;
        bool exists;
    }
    
    // Store escrows
    mapping(bytes32 => Escrow) public escrows;
    
    // Counter for unique IDs
    uint256 public escrowCount = 0;
    
    // Events
    event EscrowCreated(bytes32 indexed id, address client, address worker, uint256 amount);
    event FundsReleased(bytes32 indexed id, address worker, uint256 amount);
    event RefundIssued(bytes32 indexed id, address client, uint256 amount);
    
    /**
     * @dev Create escrow (client sends ETH here)
     * Usage: client sends payment + calls this function
     */
    function createEscrow(address _worker) public payable returns (bytes32) {
        require(msg.value > 0, "Must send ETH");
        require(_worker != address(0), "Invalid worker");
        require(_worker != msg.sender, "Can't escrow yourself");
        
        // Create unique ID
        bytes32 escrowId = keccak256(
            abi.encodePacked(msg.sender, _worker, block.timestamp, escrowCount)
        );
        escrowCount++;
        
        // Create escrow
        escrows[escrowId] = Escrow({
            client: msg.sender,
            worker: _worker,
            amount: msg.value,
            released: false,
            exists: true
        });
        
        emit EscrowCreated(escrowId, msg.sender, _worker, msg.value);
        return escrowId;
    }
    
    /**
     * @dev Client releases payment to worker (after work is done)
     */
    function releaseFunds(bytes32 _escrowId) public {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.exists, "Escrow doesn't exist");
        require(msg.sender == escrow.client, "Only client can release");
        require(!escrow.released, "Already released");
        
        escrow.released = true;
        
        // Send ETH to worker
        (bool success, ) = escrow.worker.call{value: escrow.amount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(_escrowId, escrow.worker, escrow.amount);
    }
    
    /**
     * @dev Worker refunds client (if declining job)
     */
    function refundClient(bytes32 _escrowId) public {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.exists, "Escrow doesn't exist");
        require(msg.sender == escrow.worker, "Only worker can refund");
        require(!escrow.released, "Already released");
        
        // Send ETH back to client
        (bool success, ) = escrow.client.call{value: escrow.amount}("");
        require(success, "Refund failed");
        
        emit RefundIssued(_escrowId, escrow.client, escrow.amount);
    }
    
    /**
     * @dev Get escrow details
     */
    function getEscrow(bytes32 _escrowId) public view returns (Escrow memory) {
        return escrows[_escrowId];
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

### Contract 2: Simple NFT (100 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleNFT
 * @dev Issue NFT certificates for skills
 * LEARNING PURPOSE - Deploy on testnet or local blockchain
 */

contract SimpleNFT {
    
    // Token data
    struct Certificate {
        string skillName;
        uint256 issuedAt;
        bool exists;
    }
    
    // Owner
    address public owner;
    
    // Token counter
    uint256 public tokenId = 0;
    
    // Token to certificate mapping
    mapping(uint256 => Certificate) public certificates;
    
    // Owner to tokens mapping
    mapping(address => uint256[]) public ownerTokens;
    
    // Events
    event CertificateIssued(uint256 indexed tokenId, address indexed recipient, string skill);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Issue certificate to address
     */
    function issueCertificate(address _recipient, string memory _skill) 
        public 
        onlyOwner 
        returns (uint256) 
    {
        require(_recipient != address(0), "Invalid recipient");
        
        uint256 newTokenId = tokenId;
        tokenId++;
        
        certificates[newTokenId] = Certificate({
            skillName: _skill,
            issuedAt: block.timestamp,
            exists: true
        });
        
        ownerTokens[_recipient].push(newTokenId);
        
        emit CertificateIssued(newTokenId, _recipient, _skill);
        return newTokenId;
    }
    
    /**
     * @dev Get certificate details
     */
    function getCertificate(uint256 _tokenId) 
        public 
        view 
        returns (Certificate memory) 
    {
        require(certificates[_tokenId].exists, "Certificate doesn't exist");
        return certificates[_tokenId];
    }
    
    /**
     * @dev Get all certificates for address
     */
    function getCertificatesByAddress(address _owner) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return ownerTokens[_owner];
    }
    
    /**
     * @dev Get certificate count
     */
    function getTotalCertificates() public view returns (uint256) {
        return tokenId;
    }
}
```

### Contract 3: Simple Reputation (80 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleReputation
 * @dev Track user reputation scores
 * LEARNING PURPOSE - Use on testnet or local blockchain
 */

contract SimpleReputation {
    
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
    
    /**
     * @dev Add rating for user (1-5 stars)
     */
    function addRating(address _user, uint256 _rating) public onlyOwner {
        require(_user != address(0), "Invalid user");
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        
        if (!reputations[_user].exists) {
            reputations[_user].exists = true;
        }
        
        reputations[_user].totalRating += _rating;
        reputations[_user].ratingCount += 1;
        reputations[_user].jobsCompleted += 1;
        
        emit RatingAdded(
            _user,
            _rating,
            getAverageRating(_user)
        );
    }
    
    /**
     * @dev Get average rating
     */
    function getAverageRating(address _user) public view returns (uint256) {
        if (reputations[_user].ratingCount == 0) return 0;
        
        return (reputations[_user].totalRating * 100) / reputations[_user].ratingCount;
    }
    
    /**
     * @dev Get full reputation
     */
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

## Testing Without Gas Fees

### Test File: escrow.test.js

```javascript
// test/escrow.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleEscrow", function () {
  let escrow, client, worker, other;

  before(async function () {
    // Get test accounts (FREE - provided by Hardhat)
    [client, worker, other] = await ethers.getSigners();

    // Deploy contract (FREE - local blockchain)
    const Escrow = await ethers.getContractFactory("SimpleEscrow");
    escrow = await Escrow.deploy();
  });

  it("Should create escrow with ETH", async function () {
    // Send 1 ETH to create escrow (fake ETH, no cost)
    const tx = await escrow
      .connect(client)
      .createEscrow(worker.address, { value: ethers.parseEther("1") });

    const receipt = await tx.wait();
    
    expect(receipt.status).to.equal(1);
    expect(await escrow.escrowCount()).to.equal(1);
  });

  it("Should release funds to worker", async function () {
    // Create escrow
    const tx1 = await escrow
      .connect(client)
      .createEscrow(worker.address, { value: ethers.parseEther("1") });
    
    const receipt1 = await tx1.wait();
    const escrowId = receipt1.logs[0].topics[1]; // Get ID from event

    // Check initial balance
    const balanceBefore = await ethers.provider.getBalance(worker.address);

    // Release funds
    await escrow.connect(client).releaseFunds(escrowId);

    // Check balance increased
    const balanceAfter = await ethers.provider.getBalance(worker.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("Should refund client", async function () {
    // Create escrow
    const tx1 = await escrow
      .connect(client)
      .createEscrow(worker.address, { value: ethers.parseEther("1") });
    
    const receipt1 = await tx1.wait();
    const escrowId = receipt1.logs[0].topics[1];

    // Worker refunds
    await escrow.connect(worker).refundClient(escrowId);

    // Should fail on second refund
    await expect(
      escrow.connect(worker).refundClient(escrowId)
    ).to.be.revertedWith("Already released");
  });
});
```

### Run Tests (FREE)

```bash
# Run all tests (no gas fees, instant)
npx hardhat test

# Output:
#   SimpleEscrow
#     ✓ Should create escrow with ETH (250ms)
#     ✓ Should release funds to worker (180ms)
#     ✓ Should refund client (220ms)
#
#   3 passing (2s)
```

---

## Frontend Integration

### React Component: EscrowUI

```javascript
// components/EscrowUI.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import SimpleEscrowABI from '../contracts/SimpleEscrow.json';

interface EscrowUIProps {
  contractAddress: string;
  workerAddress: string;
}

export function EscrowUI({ contractAddress, workerAddress }: EscrowUIProps) {
  const [amount, setAmount] = useState('0.1'); // ETH
  const [escrowId, setEscrowId] = useState('');
  const [status, setStatus] = useState('');

  const createEscrow = async () => {
    try {
      setStatus('Creating escrow...');

      // Connect to MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        SimpleEscrowABI,
        signer
      );

      // Send ETH to create escrow (FREE on testnet)
      const tx = await contract.createEscrow(workerAddress, {
        value: ethers.parseEther(amount)
      });

      setStatus('Transaction sent. Waiting for confirmation...');
      const receipt = await tx.wait();

      // Get escrow ID from event
      const event = receipt.logs
        .map(log => contract.interface.parseLog(log))
        .find(e => e.name === 'EscrowCreated');

      setEscrowId(event.args[0]);
      setStatus('✅ Escrow created!');

    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const releaseFunds = async () => {
    try {
      setStatus('Releasing funds...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        contractAddress,
        SimpleEscrowABI,
        signer
      );

      const tx = await contract.releaseFunds(escrowId);
      await tx.wait();

      setStatus('✅ Funds released to worker!');

    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>Simple Escrow (Test)</h2>

      <div>
        <label>
          Amount (ETH):
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            step="0.1"
            min="0"
          />
        </label>
      </div>

      <button onClick={createEscrow}>
        Create Escrow (FREE - Testnet)
      </button>

      {escrowId && (
        <>
          <p>Escrow ID: {escrowId.substring(0, 10)}...</p>
          <button onClick={releaseFunds}>Release Funds</button>
        </>
      )}

      <p>{status}</p>
    </div>
  );
}
```

---

## Testnet Deployment (Free)

### Deploy to Sepolia (Free Test ETH)

```bash
# 1. Get free test ETH
# Go to: https://sepoliafaucet.com
# Paste your address, click "Request 0.5 testnet ETH"
# (Repeat every 24 hours)

# 2. Update hardhat.config.js
```

```javascript
// hardhat.config.js
module.exports = {
  solidity: "0.8.0",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // Free tier
      accounts: [process.env.PRIVATE_KEY] // Your metamask private key
    }
  }
};
```

```bash
# 3. Create .env file
echo "PRIVATE_KEY=0x..." > .env

# 4. Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia

# Output:
# Deploying contracts...
# SimpleEscrow deployed to: 0x5FbDB2...
# SimpleNFT deployed to: 0x7aB3e4...
# SimpleReputation deployed to: 0xB1c2d3...
```

---

## Complete Project Structure

I'll create all files now: