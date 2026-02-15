# Blockchain Service Integration — Implementation Plan

## Goal

Integrate the standalone `blockchain-service` (from the scratch folder) into the Tulifo Gig monorepo, enabling **dual payment flows**: Stripe (fiat) and Stripe Crypto (cryptocurrency), with on-chain escrow, NFT skill certificates, and blockchain-backed reputation.

---

## Phase 1: Add Blockchain Service to Monorepo

Copy the service and adapt it to match existing monorepo conventions.

### [NEW] `apps/blockchain-service/`

Copy the entire scratch service into the monorepo:

```bash
cp -r /Users/mahesh/.gemini/antigravity/scratch/apps/blockchain-service \
      /Users/mahesh/Work/tulifo-gig-backend/apps/blockchain-service
```

Then clean up non-monorepo artifacts:
```bash
cd /Users/mahesh/Work/tulifo-gig-backend/apps/blockchain-service
rm -rf node_modules package-lock.json pnpm-lock.yaml .env .DS_Store
```

---

#### [MODIFY] [package.json](file:///Users/mahesh/Work/tulifo-gig-backend/apps/blockchain-service/package.json)

Rename to match monorepo naming convention and move `ethers` from `devDependencies` to `dependencies` (needed at runtime). Add `dotenv` to dependencies.

```diff
-  "name": "blockchain-service",
+  "name": "@tulifo/blockchain-service",

   "devDependencies": {
-    "ethers": "^6.4.0",
     ...
   },
   "dependencies": {
+    "ethers": "^6.4.0",
     "dotenv": "^16.3.0",
     ...
   }
```

---

#### [NEW] [Dockerfile](file:///Users/mahesh/Work/tulifo-gig-backend/apps/blockchain-service/Dockerfile)

Create a Dockerfile following the existing monorepo pattern. The blockchain service is special because it needs compiled contract artifacts at runtime:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/blockchain-service/package.json ./apps/blockchain-service/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/blockchain-service/ ./apps/blockchain-service/
COPY tsconfig.base.json ./
RUN cd apps/blockchain-service && pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/blockchain-service/package.json ./apps/blockchain-service/
COPY --from=builder /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
COPY --from=builder /app/apps/blockchain-service/dist ./apps/blockchain-service/dist
# Copy compiled contract artifacts (ABIs) and addresses — needed at runtime
COPY --from=builder /app/apps/blockchain-service/artifacts ./apps/blockchain-service/artifacts
COPY --from=builder /app/apps/blockchain-service/contract-addresses.json ./apps/blockchain-service/
WORKDIR /app/apps/blockchain-service
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
```

> [!IMPORTANT]
> This Dockerfile copies `artifacts/` and `contract-addresses.json` into the production image because `web3.service.ts` reads ABIs and addresses from disk at runtime. If you later switch to embedding ABIs in code, you can remove those COPY lines.

---

## Phase 2: Docker Compose & Environment

### [MODIFY] [docker-compose.yml](file:///Users/mahesh/Work/tulifo-gig-backend/docker-compose.yml)

Add the `blockchain-service` and a local Hardhat node:

```yaml
  # ─── Blockchain ─────────────────────────
  hardhat-node:
    image: node:20-alpine
    working_dir: /app
    command: sh -c "corepack enable && corepack prepare pnpm@latest --activate && cd apps/blockchain-service && pnpm install && npx hardhat node --hostname 0.0.0.0"
    volumes:
      - .:/app
    ports:
      - "8545:8545"
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD-SHELL", "wget -qO- http://localhost:8545 || exit 1"]
    networks:
      - tulifo-gig-network

  blockchain-service:
    build:
      context: .
      dockerfile: apps/blockchain-service/Dockerfile
    ports:
      - "3016:3016"
    environment:
      - NODE_ENV=development
      - PORT=3016
      - RPC_URL=http://hardhat-node:8545
      - PRIVATE_KEY=${BLOCKCHAIN_PRIVATE_KEY}
      - CHAIN_ID=31337
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - CORS_ORIGIN=${CORS_ORIGIN}
    depends_on:
      hardhat-node:
        condition: service_healthy
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD-SHELL", "wget -qO- http://localhost:3016/health || exit 1"]
    networks:
      - tulifo-gig-network
```

> [!NOTE]
> For **production**, replace `hardhat-node` with a real RPC URL (Alchemy/Infura pointing to Polygon or Sepolia). The `hardhat-node` service is for local development only. An alternative is to use Docker volumes and a deployment script initializer.

---

### [MODIFY] [.env](file:///Users/mahesh/Work/tulifo-gig-backend/.env)

Add blockchain-specific environment variables:

```diff
+# Blockchain
+BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
+RPC_URL=http://localhost:8545
+CHAIN_ID=31337
```

> [!WARNING]
> The key above is the **default Hardhat Account #0** — safe for local dev only. **Never** use this key on testnet or mainnet. For Sepolia/production, generate a new key via MetaMask and fund it from a faucet.

---

## Phase 3: Database Schema (Supabase PostgreSQL)

Use the existing Supabase PostgreSQL database. Add indexing tables for blockchain data.

### [NEW] `apps/blockchain-service/src/db/schema.ts`

Create a Drizzle schema file for blockchain tables:

```typescript
import { pgTable, uuid, varchar, decimal, bigint, boolean, timestamp } from 'drizzle-orm/pg-core';

// Blockchain transaction index
export const blockchainTransactions = pgTable('blockchain_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  contractName: varchar('contract_name', { length: 50 }).notNull(),
  methodName: varchar('method_name', { length: 100 }),
  fromAddress: varchar('from_address', { length: 42 }),
  toAddress: varchar('to_address', { length: 42 }),
  amount: decimal('amount', { precision: 36, scale: 18 }),
  blockNumber: bigint('block_number', { mode: 'number' }),
  status: varchar('status', { length: 20 }).default('pending'),
  bookingId: varchar('booking_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Wallet-to-user mapping
export const userWallets = pgTable('user_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  isPrimary: boolean('is_primary').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// NFT certificate cache
export const nftCertificates = pgTable('nft_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: bigint('token_id', { mode: 'number' }).notNull().unique(),
  ownerAddress: varchar('owner_address', { length: 42 }),
  userId: uuid('user_id'),
  skillName: varchar('skill_name', { length: 100 }),
  issuer: varchar('issuer', { length: 100 }),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  txHash: varchar('tx_hash', { length: 66 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

Push to Supabase:
```bash
cd apps/blockchain-service && pnpm db:push
```

---

## Phase 4: Wire Up Existing Services

### [MODIFY] [escrow-service/src/index.ts](file:///Users/mahesh/Work/tulifo-gig-backend/apps/escrow-service/src/index.ts)

Add `payment_method` and `blockchain_tx_hash` columns for hybrid tracking:

```diff
 // Create escrow account
 app.post('/api/v1/escrow', async (req, res) => {
-  const { bookingId, amount, clientId, workerId } = req.body;
+  const { bookingId, amount, clientId, workerId, paymentMethod = 'fiat', blockchainTxHash = null } = req.body;

   try {
     const result = await pgPool.query(
-      `INSERT INTO escrow_accounts (booking_id, client_id, worker_id, held_amount, status)
-       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
-      [bookingId, clientId, workerId, amount]
+      `INSERT INTO escrow_accounts (booking_id, client_id, worker_id, held_amount, status, payment_method, blockchain_tx_hash)
+       VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING *`,
+      [bookingId, clientId, workerId, amount, paymentMethod, blockchainTxHash]
     );
```

> [!NOTE]
> You'll also need to run a migration to add the two new columns to the `escrow_accounts` table:
> ```sql
> ALTER TABLE escrow_accounts ADD COLUMN payment_method VARCHAR(10) DEFAULT 'fiat';
> ALTER TABLE escrow_accounts ADD COLUMN blockchain_tx_hash VARCHAR(66);
> ```

---

### [MODIFY] [payment-service/src/routes/payment.routes.ts](file:///Users/mahesh/Work/tulifo-gig-backend/apps/payment-service/src/routes/payment.routes.ts)

Add a crypto payment redirect route that forwards to the blockchain service:

```diff
+// Create crypto payment session (delegates to blockchain-service)
+router.post('/create-crypto-intent', authenticate, async (req: Request, res: Response, next: NextFunction) => {
+  try {
+    const { bookingId, workerAddress, amount } = req.body;
+
+    // Forward to blockchain-service for Stripe Crypto Onramp
+    const response = await fetch('http://blockchain-service:3016/api/v1/stripe/create-onramp-session', {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify({
+        bookingId,
+        walletAddress: workerAddress,
+        amount,
+        currency: 'usd'
+      })
+    });
+
+    const data = await response.json();
+
+    // Record in payments table
+    await pool.query(
+      `INSERT INTO payments (booking_id, payer_id, payee_id, amount, currency, status, payment_method)
+       VALUES ($1, $2, $3, $4, 'USD', 'pending', 'crypto')`,
+      [bookingId, req.user!.userId, req.body.payeeId, amount]
+    );
+
+    res.json({ success: true, data });
+  } catch (error) {
+    next(error);
+  }
+});
```

> [!NOTE]
> Also add `payment_method` column to the `payments` table:
> ```sql
> ALTER TABLE payments ADD COLUMN payment_method VARCHAR(10) DEFAULT 'fiat';
> ```

---

## Phase 5: Frontend Integration

### [NEW] `app/providers/Web3Provider.tsx`

Copy and adapt from [scratch Web3Provider](file:///Users/mahesh/.gemini/antigravity/scratch/apps/frontend-sim/components/Web3Provider.tsx). Wrap the app layout to provide wallet context globally.

### [NEW] `app/components/CryptoPayment.tsx`

Copy and adapt from [scratch CryptoPayment](file:///Users/mahesh/.gemini/antigravity/scratch/apps/frontend-sim/components/CryptoPayment.tsx). Update API URL to use relative paths (proxied through Next.js API routes).

### [MODIFY] Payment Pages

Add a payment method toggle on booking/checkout pages:

```tsx
{paymentMethod === 'fiat' ? (
  <StripeCheckoutForm ... />  {/* Existing */}
) : (
  <CryptoPayment              {/* New */}
    bookingId={booking.id}
    workerAddress={worker.walletAddress}
    amount={booking.amount}
    onSuccess={handlePaymentSuccess}
  />
)}
```

### [NEW] `app/api/blockchain/route.ts`

Create a Next.js API route to proxy calls to the blockchain service (same pattern as `/api/health/route.ts`):

```typescript
export async function POST(request: Request) {
  const { pathname, body } = await parseRequest(request);
  const res = await fetch(`http://localhost:3016${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Response.json(await res.json());
}
```

---

## Verification Plan

### Automated Tests

```bash
# 1. Compile smart contracts
cd apps/blockchain-service && npx hardhat compile

# 2. Run contract tests
npx hardhat test

# 3. Start Hardhat node + deploy contracts
npx hardhat node &
npx hardhat run scripts/deploy.ts --network localhost

# 4. Health check
curl http://localhost:3016/health
# Expected: { "status": "healthy", "web3Connected": true }

# 5. Test escrow creation
curl -X POST http://localhost:3016/api/v1/escrow/create \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"TEST-001","clientAddress":"0xf39...","workerAddress":"0x70...","amount":"1.0"}'
```

### Docker Integration

```bash
# Rebuild all services including blockchain
docker-compose up -d --build blockchain-service hardhat-node

# Verify health
docker-compose logs --tail=20 blockchain-service
# Expected: "🚀 Blockchain service running on http://localhost:3016"
```

### Manual Verification

- Open the dev tools page at `http://localhost:3000/status/dev` → verify blockchain-service appears
- Open the status page at `http://localhost:3000/status` → verify blockchain-service is healthy
- Test the frontend crypto payment flow on a booking page (requires MetaMask)

---

## File Summary

| File | Action | Phase |
|---|---|---|
| `apps/blockchain-service/` | **[NEW]** Copy from scratch | 1 |
| `apps/blockchain-service/package.json` | **[MODIFY]** Rename, fix deps | 1 |
| `apps/blockchain-service/Dockerfile` | **[NEW]** Standard monorepo pattern | 1 |
| `docker-compose.yml` | **[MODIFY]** Add blockchain + hardhat | 2 |
| `.env` | **[MODIFY]** Add blockchain vars | 2 |
| `apps/blockchain-service/src/db/schema.ts` | **[NEW]** Drizzle schema | 3 |
| `apps/escrow-service/src/index.ts` | **[MODIFY]** Add payment_method | 4 |
| `apps/payment-service/src/routes/payment.routes.ts` | **[MODIFY]** Add crypto route | 4 |
| `app/providers/Web3Provider.tsx` | **[NEW]** Wallet context | 5 |
| `app/components/CryptoPayment.tsx` | **[NEW]** Crypto payment UI | 5 |
| `app/api/blockchain/route.ts` | **[NEW]** API proxy | 5 |
