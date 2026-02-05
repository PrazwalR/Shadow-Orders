# 🔐 Environment Configuration Guide - Shadow Orders

Complete guide for setting up your `.env` file for deployment and testing.

---

## 📋 Table of Contents

1. [Required Configuration](#required-configuration)
2. [Optional Configuration](#optional-configuration)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [API Keys & Services](#api-keys--services)
5. [Verification Checklist](#verification-checklist)

---

## ✅ Required Configuration

These are **MUST HAVE** for deployment:

### 1. **Base Sepolia RPC** ✓ Already Set
```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_CHAIN_ID=84532
```
- **What:** Connection to Base Sepolia blockchain
- **Where:** Public RPC (already configured)
- **Cost:** FREE
- **Status:** ✅ No action needed

---

### 2. **Deployer Private Key** 🔑 REQUIRED
```env
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
```

**How to Get:**
1. Open MetaMask/Wallet
2. Click Account → Settings → Security & Privacy
3. Click "Show Private Key"
4. Enter password
5. Copy the private key (starts with 0x)

**⚠️ CRITICAL SECURITY:**
- ❌ NEVER commit `.env` to GitHub
- ✅ `.env` is in `.gitignore` (already configured)
- 🔒 This key controls your funds - keep it secret!

**Funding:**
- Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Need: 0.1-0.5 ETH (FREE from faucet)

---

### 3. **Keeper Private Key** 🤖 REQUIRED
```env
KEEPER_PRIVATE_KEY=0xYourKeeperPrivateKeyHere
```

**How to Get:**
1. Create a **separate wallet** for the keeper bot (security best practice)
2. In MetaMask: Click dropdown → "Create Account"
3. Export its private key (same process as above)
4. Fund it with 0.05 testnet ETH (for gas)

**Why Separate:**
- Keeper runs automatically
- Isolates risk from your main wallet
- Easier to monitor bot activity

---

### 4. **Contract Addresses** ✓ Already Configured
```env
POOL_MANAGER_ADDRESS=0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408
POSITION_MANAGER_ADDRESS=0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80
UNIVERSAL_ROUTER_ADDRESS=0x492e6456d9528771018deb9e87ef7750ef184104
QUOTER_V2_ADDRESS=0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba
```
- **Status:** ✅ Already configured for Base Sepolia
- **Source:** https://docs.uniswap.org/contracts/v4/deployments

---

## 🔧 Optional Configuration

These **enhance functionality** but aren't required for basic deployment:

### 5. **Alchemy API Key** (Recommended for Production)

**What it does:**
- More reliable RPC connection than public endpoints
- Higher rate limits (300,000 requests/month free tier)
- Better performance and uptime

**How to Get:**
1. Go to: https://www.alchemy.com/
2. Click "Sign Up" → Use GitHub or Email
3. Create account (FREE)
4. Click "Create App"
   - Chain: Base
   - Network: Base Sepolia
   - Name: "Shadow Orders"
5. Click on your app → "API Key"
6. Copy the API key

**Update .env:**
```env
ALCHEMY_API_KEY=your_actual_key_here
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**Cost:** FREE (up to 300k requests/month)

---

### 6. **The Graph API Key** (For Order Indexing)

**What it does:**
- Indexes on-chain events (OrderCreated, OrderExecuted)
- Allows frontend to quickly query order history
- Enables "My Orders" dashboard

**How to Get:**
1. Go to: https://thegraph.com/studio/
2. Click "Sign In" → Connect wallet
3. Go to "Billing" → "Add Payment Method"
4. Get API key from dashboard
5. Copy API key

**Update .env:**
```env
GRAPH_API_KEY=your_graph_api_key_here
```

**Cost:** 
- FREE tier: 100k queries/month
- Pay-as-you-go: $4 per 100k queries

**Alternative:** 
You can build a simple Node.js indexer instead (see `keeper/` for event listening)

---

### 7. **WalletConnect Project ID** (For Frontend Wallet Connection)

**What it does:**
- Enables users to connect mobile wallets to your dApp
- Required for WalletConnect v2

**How to Get:**
1. Go to: https://cloud.walletconnect.com/
2. Click "Sign Up" → Use Email or GitHub
3. Create Project:
   - Name: "Shadow Orders"
   - Type: "App"
4. Copy Project ID from dashboard

**Update .env:**
```env
WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**Cost:** FREE (up to 1M requests/month)

---

### 8. **BaseScan API Key** (For Contract Verification)

**What it does:**
- Verifies your contract source code on BaseScan
- Makes your contract readable on block explorer
- Builds trust with users

**How to Get:**
1. Go to: https://basescan.org/
2. Click "Sign In" → Create account
3. Go to: https://basescan.org/myapikey
4. Click "Add" → Name: "Shadow Orders"
5. Copy API key

**Update .env:**
```env
BASESCAN_API_KEY=your_basescan_api_key_here
```

**Cost:** FREE

**Verify Contract:**
```bash
forge verify-contract \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  <CONTRACT_ADDRESS> \
  src/ShadowOrdersHook.sol:ShadowOrdersHook
```

---

### 9. **Tenderly** (For Debugging & Simulations)

**What it does:**
- Simulates transactions before sending
- Debugs failed transactions with detailed traces
- Monitors contract events in real-time

**How to Get:**
1. Go to: https://dashboard.tenderly.co/
2. Sign up with GitHub
3. Create Project: "Shadow Orders"
4. Go to Settings → Access Token
5. Generate token

**Update .env:**
```env
TENDERLY_ACCESS_KEY=your_access_key_here
TENDERLY_PROJECT_SLUG=shadow-orders
```

**Cost:** FREE tier (generous limits for testing)

---

### 10. **Infura** (Alternative RPC Provider)

**What it does:**
- Backup RPC endpoint
- Automatic failover if Alchemy is down

**How to Get:**
1. Go to: https://www.infura.io/
2. Sign up (FREE)
3. Create Project → "Shadow Orders"
4. Copy API key

**Update .env:**
```env
INFURA_API_KEY=your_infura_api_key_here
```

**Cost:** FREE (up to 100k requests/day)

---

## 📝 Step-by-Step Setup

### **Minimal Setup (5 minutes - For Testing)**

```bash
# 1. Copy example file
cp .env.example .env

# 2. Edit .env
nano .env  # or use your editor

# 3. Fill ONLY these:
DEPLOYER_PRIVATE_KEY=0x... # From MetaMask
KEEPER_PRIVATE_KEY=0x...   # From separate account

# 4. Done! Ready to deploy
```

---

### **Production Setup (30 minutes - For Hackathon/Demo)**

```bash
# 1. Get testnet funds
# Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

# 2. Create accounts
# - Deployer wallet (funded with 0.3 ETH)
# - Keeper wallet (funded with 0.05 ETH)  
# - Test user wallet (funded with 0.02 ETH)

# 3. Get API keys (optional but recommended):
# ✅ Alchemy (better RPC)
# ✅ BaseScan (contract verification)
# ⏩ WalletConnect (if building frontend)
# ⏩ The Graph (if need indexing)

# 4. Update .env with all keys

# 5. Verify configuration
forge build
forge test
```

---

## 🔍 Current Configuration Status

### ✅ Already Configured (No Action Needed):
- Base Sepolia RPC endpoints
- Uniswap V4 contract addresses (PoolManager, Router, etc.)
- Permit2 address
- Inco singleton address
- Network chain IDs

### 🔑 You Must Add:
- `DEPLOYER_PRIVATE_KEY` - Your wallet's private key
- `KEEPER_PRIVATE_KEY` - Bot wallet's private key

### 🎯 Recommended to Add:
- `ALCHEMY_API_KEY` - Better RPC performance
- `BASESCAN_API_KEY` - Contract verification
- `WALLETCONNECT_PROJECT_ID` - Frontend wallet connection

### ⏩ Optional (For Advanced Features):
- `GRAPH_API_KEY` - Event indexing
- `TENDERLY_ACCESS_KEY` - Transaction debugging
- `INFURA_API_KEY` - Backup RPC

---

## 🎯 Quick Reference Table

| Variable | Required? | Where to Get | Cost | Time |
|----------|-----------|--------------|------|------|
| `DEPLOYER_PRIVATE_KEY` | ✅ Required | MetaMask export | FREE | 1 min |
| `KEEPER_PRIVATE_KEY` | ✅ Required | MetaMask new account | FREE | 2 min |
| `ALCHEMY_API_KEY` | ⭐ Recommended | alchemy.com | FREE | 3 min |
| `BASESCAN_API_KEY` | ⭐ Recommended | basescan.org | FREE | 2 min |
| `WALLETCONNECT_PROJECT_ID` | 🔧 Optional | cloud.walletconnect.com | FREE | 3 min |
| `GRAPH_API_KEY` | 🔧 Optional | thegraph.com | FREE tier | 5 min |
| `TENDERLY_ACCESS_KEY` | 🔧 Optional | tenderly.co | FREE tier | 3 min |

---

## ✅ Verification Checklist

Before deploying, verify:

```bash
# 1. Check private keys are set (should NOT print actual keys)
if grep -q "0xYourPrivateKeyHere" .env; then
  echo "❌ ERROR: Update DEPLOYER_PRIVATE_KEY in .env"
else
  echo "✅ Deployer key configured"
fi

# 2. Check contract addresses
if grep -q "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" .env; then
  echo "✅ PoolManager address correct"
else
  echo "❌ ERROR: PoolManager address incorrect"
fi

# 3. Test RPC connection
cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL
# Should output: 84532

# 4. Check deployer balance
cast balance <YOUR_DEPLOYER_ADDRESS> --rpc-url $BASE_SEPOLIA_RPC_URL --ether
# Should be > 0.1 ETH

# 5. Run tests
forge test --match-path contracts/src/test/ShadowOrdersHook.t.sol
# Should pass all 13 tests
```

---

## 🚨 Security Best Practices

1. **Never commit `.env` file**
   ```bash
   # Verify it's in .gitignore
   git check-ignore .env
   # Should output: .env
   ```

2. **Use environment-specific files**
   ```bash
   .env.local      # Local development (not committed)
   .env.testnet    # Base Sepolia (not committed)
   .env.production # Future mainnet (not committed)
   ```

3. **Rotate keys regularly**
   - Change private keys every 3-6 months
   - Use separate keys for dev/prod
   - Never reuse keys across projects

4. **Limit key permissions**
   - Keeper bot: Only needs enough ETH for gas
   - Test users: Only needs small amounts
   - Deployer: Keep most funds in cold storage

---

## 📞 Getting Help

### Contract Addresses Not Working?
- Check latest deployments: https://docs.uniswap.org/contracts/v4/deployments
- Verify chain ID matches: `cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL`

### RPC Connection Issues?
- Use Alchemy instead of public RPC
- Check rate limits (public RPC = 330 req/min)
- Try alternative: `https://base-sepolia.blockpi.network/v1/rpc/public`

### Need Testnet Funds?
- **Primary:** https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Secondary:** https://www.alchemy.com/faucets/base-sepolia
- **Alternative:** https://faucet.quicknode.com/base/sepolia

### API Key Not Working?
- Check key is active (not expired/revoked)
- Verify plan limits (free tier restrictions)
- Check whitelist settings (IP/domain restrictions)

---

## 🎉 Ready to Deploy!

Once you've configured:
1. ✅ `DEPLOYER_PRIVATE_KEY`
2. ✅ `KEEPER_PRIVATE_KEY`
3. ✅ Funded both wallets with testnet ETH

You're ready to deploy:

```bash
# Build contracts
cd contracts && forge build

# Deploy hook
forge script script/Deploy.s.sol:DeployShadowOrders \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Start keeper bot
cd ../keeper && npm install && npm start
```

---

**Questions?** Check:
- Inco Docs: https://docs.inco.org/
- Uniswap V4: https://docs.uniswap.org/contracts/v4/overview
- Base Docs: https://docs.base.org/

**Good luck with your hackathon! 🚀**
