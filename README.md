# Shadow Orders 🥷

**Privacy-Preserving Limit Orders on Uniswap V4 Using Inco Lightning (TEE)**

Shadow Orders enables users to place encrypted limit orders on Uniswap V4 without revealing their trading intentions. By leveraging **Inco Network's Lightning SDK** and **Uniswap V4's hook architecture**, Shadow Orders protects traders from front-running and MEV attacks while maintaining full decentralization.

---

## 🎯 Problem Statement

Traditional limit orders on DEXs expose traders to several vulnerabilities:

1. **Front-Running**: Malicious actors can see pending limit orders in the mempool and execute their trades first
2. **MEV Extraction**: Sophisticated bots extract value by observing order parameters (direction, size, limit price)
3. **Privacy Loss**: All trading strategies are visible on-chain, allowing competitors to exploit this information
4. **Market Manipulation**: Large limit orders can be used to manipulate market prices when visible

### Example Scenario

Imagine Alice wants to buy 1000 USDC worth of ETH when the price drops to $2,900. With traditional DEXs:

1. Alice submits a limit order with her parameters visible in the mempool
2. Bob (a MEV bot) sees this large order and the target price
3. Bob front-runs Alice's order, buying ETH just before $2,900
4. The price moves up due to Bob's purchase
5. Alice's order executes at a worse price (or doesn't execute at all)
6. Bob sells his ETH for a profit, having extracted value from Alice

**Shadow Orders solves this**: Alice's limit price, order size, and buy/sell direction are all encrypted using TEE. Bob can see there's an order, but has no idea what the parameters are, eliminating front-running opportunities.

---

## 💡 Solution

Shadow Orders uses **Inco Lightning with Trusted Execution Environment (TEE)** to encrypt order parameters client-side before submitting them on-chain. The smart contract can verify these encrypted values against market conditions while preserving privacy throughout the entire lifecycle.

### Key Innovations

1. **Client-Side TEE Encryption**: Order parameters are encrypted in the browser using Inco's Lightning SDK
2. **Uniswap V4 Hooks**: Custom hook intercepts swap operations to check encrypted limit orders
3. **Keeper Network**: Decentralized keepers monitor for triggered orders and execute swaps
4. **Privacy First**: Order parameters remain encrypted using Inco Lightning's TEE technology

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Frontend                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Connect    │  │ Create Order │  │ Inco Lightning      │   │
│  │ Wallet     │─▶│ Interface    │─▶│ SDK (Encryption)    │   │
│  └────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                  │ Encrypted Order Parameters
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Base Sepolia (Testnet)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              ShadowOrdersHook.sol                           │ │
│  │  • Stores TEE-encrypted limit orders                       │ │
│  │  • Verifies encrypted conditions on swap                   │ │
│  │  • Triggers order execution when limit reached             │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Uniswap V4 PoolManager                        │ │
│  │  • Executes swaps through hook callbacks                   │ │
│  │  • Calls beforeSwap() and afterSwap() hooks                │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                  │ Order Triggered Event
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Keeper Network                             │
│  • Monitors blockchain for triggered orders                     │
│  • Executes swaps on behalf of users                            │
│  • Transfers output tokens back to users                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.5.5** with Turbopack for fast development
- **React 19** with server components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### Blockchain
- **Base Sepolia Testnet** (Chain ID: 84532)
- **Uniswap V4** with hooks architecture
- **Foundry** for smart contract development
- **Solidity 0.8.26** for contract language

### Encryption & Privacy
- **Inco Network Lightning SDK** (`@inco/js`) for client-side encryption
- **TEE (Trusted Execution Environment)** for secure computations
- **Base Sepolia integration** for encrypted computations on Layer 2

### Web3 Integration
- **Wagmi v3.4.2** for React hooks
- **Viem v2.45.1** for Ethereum interactions
- **RainbowKit v2.2.10** for wallet connection
- **MetaMask SDK** for wallet support

### Data & APIs
- **CoinGecko API** for real-time price feeds
- **React Query** for data fetching and caching

---

## 📋 How It Works

### 1. Order Creation Flow

```typescript
// User specifies order parameters
const order = {
  tokenIn: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
  tokenOut: "0x4200000000000000000000000000000000000006", // WETH
  limitPrice: 2900.0, // Target: $2,900/ETH
  amount: 1000e6, // 1000 USDC (6 decimals)
  isBuyOrder: true
};

// 1. Frontend encrypts using Inco Lightning SDK
const lightning = await Lightning.latest("testnet", 84532);
const encryptedLimitPrice = await lightning.encrypt64(limitPrice);
const encryptedAmount = await lightning.encrypt64(amount);
const encryptedDirection = await lightning.encryptBool(isBuyOrder);

// 2. Submit encrypted parameters to smart contract
const tx = await shadowOrdersHook.createOrder(
  encryptedLimitPrice,
  encryptedAmount,
  encryptedDirection,
  tokenIn,
  tokenOut,
  { value: parseEther("0.0003") } // Small fee for TEE computation
);

// 3. Order is stored on-chain, fully encrypted
```

### 2. Price Simulation & Tracking

After order creation, the frontend:
- Captures the current market price as the starting point
- Simulates realistic price movement (±12% per tick, 2-second intervals)
- Displays live progress toward the limit price
- Shows both the Order TX (FHE encryption) and eventual Swap TX

### 3. Order Execution Flow

```solidity
// In ShadowOrdersHook.sol - called on every swap

function beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external override returns (bytes4, BeforeSwapDelta, uint24) {
    
    // Check all active orders for this pool
    for (uint256 i = 0; i < orderCount; i++) {
        Order storage order = orders[i];
        
        // Homomorphic comparison (happens on encrypted data!)
        bool conditionMet = checkEncryptedCondition(
            order.encryptedLimitPrice,
            order.encryptedAmount,
            currentPrice
        );
        
        if (conditionMet) {
            // Emit event for keeper to execute
            emit OrderTriggered(i, order.user, order.tokenIn, order.tokenOut);
        }
    }
    
    return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
}
```

### 4. Keeper Execution

```typescript
// API Route: /api/execute-order/route.ts

export async function POST(req: Request) {
  const { orderId } = await req.json();
  
  // 1. Keeper pulls tokens from user
  await tokenIn.transferFrom(userAddress, keeperAddress, amount);
  
  // 2. Execute swap via Uniswap V4 PoolSwapTest
  const swapParams = {
    zeroForOne: order.isBuyOrder,
    amountSpecified: -amount,
    sqrtPriceLimitX96: getPriceLimitFromOrder(order)
  };
  
  const delta = await poolSwapTest.swap(poolKey, swapParams, testSettings);
  
  // 3. Send output tokens back to user
  await tokenOut.transfer(userAddress, outputAmount);
  
  return { success: true, txHash: receipt.transactionHash };
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- MetaMask or compatible Web3 wallet
- Base Sepolia testnet ETH (get from [faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/shadow-orders.git
cd shadow-orders

# Install frontend dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keeper private key

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

Only two environment variables are needed:

```bash
# Base Sepolia RPC endpoint
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Private key for keeper wallet (server-side only)
KEEPER_PRIVATE_KEY=your_private_key_here
```

### Smart Contract Deployment

```bash
cd backend

# Install Foundry dependencies
forge install

# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

---

## 📝 Contract Addresses (Base Sepolia)

```typescript
// Core Protocol
export const SHADOW_ORDERS_HOOK = "0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4";
export const POOL_MANAGER = "0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829";
export const POOL_SWAP_TEST = "0xe49d2815C231826caB58017e214Bed19fE1c2dD4";

// Mock Tokens for Testing
export const WETH = "0x4200000000000000000000000000000000000006";
export const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const DAI = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const WBTC = "0x9Fe9A663C2dA4F4F793F1c7a5b5BFCD0E4bA5D77";

// Keeper Wallet
export const KEEPER_ADDRESS = "0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a";
```

---

## 🧪 Testing the App

### 1. Get Test Tokens

Visit the deployed app and use the "Get Test Tokens" button in the Trade page. This will send you:
- 1000 USDC
- 1000 DAI  
- 0.1 WETH
- 0.01 WBTC

### 2. Create a Shadow Order

1. Connect your wallet (MetaMask)
2. Select token pair (e.g., USDC → WETH)
3. Enter amount (e.g., 1000 USDC)
4. Set limit price (e.g., $2,900 for ETH)
5. Choose Buy or Sell
6. Click "Create Shadow Order"
7. Approve FHE encryption (pays ~0.0003 ETH for computation)
8. Wait for transaction confirmation

### 3. Watch the Simulation

- The app captures current market price
- Simulates price movement toward your limit
- Shows progress in real-time with a visual graph
- Status updates: "Pending" → "Active" → "Executing" → "Executed"

### 4. Order Execution

- When limit price is reached, order status changes to "Executing"
- Keeper automatically triggers the swap
- You'll see the Swap TX hash appear
- Output tokens arrive in your wallet

---

## 🔐 Security Features

### TEE Encryption
- **Client-Side Encryption**: All sensitive parameters encrypted in browser before transmission
- **Trusted Execution Environment**: Uses hardware-secured execution environment
- **Privacy Preserving**: Order parameters remain encrypted throughout execution
- **Fast & Secure**: Combines speed of TEE with strong privacy guarantees

### Smart Contract Security
- **Reentrancy Guards**: All external calls protected
- **Access Control**: Only authorized keepers can execute swaps
- **Slippage Protection**: Orders include slippage tolerance
- **Order Expiration**: Time-based expiration prevents stale orders

### Keeper Security
- **Private Key Isolation**: Keeper keys stored server-side only (never exposed to frontend)
- **Gas Management**: Automatic gas estimation and retry logic
- **Error Handling**: Comprehensive error handling for failed transactions
- **Rate Limiting**: Prevents spam and DoS attacks

---

## 🗺️ Roadmap

### Phase 1: Core Protocol (✅ Complete)
- [x] FHE integration with Inco Lightning SDK
- [x] Uniswap V4 hook implementation
- [x] Basic limit order functionality
- [x] Keeper execution system
- [x] Frontend UI with wallet connection

### Phase 2: Enhanced Privacy (In Progress)
- [ ] Private mempool integration
- [ ] ZK proofs for order verification
- [ ] Multi-party computation for keeper network
- [ ] Encrypted order book (fully private)

### Phase 3: Advanced Features (Planned)
- [ ] Stop-loss orders with TEE
- [ ] Take-profit orders
- [ ] Trailing stop orders
- [ ] Time-weighted average price (TWAP) orders
- [ ] Iceberg orders (hidden size)

### Phase 4: Mainnet & Scaling (Future)
- [ ] Audit by professional security firm
- [ ] Mainnet deployment on Base
- [ ] Cross-chain support (Arbitrum, Optimism)
- [ ] Decentralized keeper network with incentives
- [ ] Governance token for protocol parameters

---

## 📊 Performance Metrics

### Gas Costs
- **Create Order**: ~500k gas (~$0.50 on Base Sepolia)
- **Order Execution**: ~300k gas (paid by keeper)
- **TEE Fee**: 0.0003 ETH (~$0.90) for encryption computation

### Latency
- **Order Creation**: 2-5 seconds (includes encryption + blockchain confirmation)
- **Price Check**: Real-time (simulated every 2 seconds)
- **Order Execution**: 10-20 seconds (keeper detection + swap execution)

### Privacy Guarantees
- **Order Parameters**: 100% encrypted on-chain
- **User Identity**: Pseudonymous (wallet address only)
- **Trading Strategy**: Completely hidden from other users and MEV bots

---

## 🤝 Contributing

We welcome contributions! Areas where you can help:

1. **Smart Contracts**: Optimize gas usage, add new order types
2. **Frontend**: Improve UI/UX, add mobile support
3. **Keeper Network**: Implement decentralized keeper coordination
4. **Testing**: Write comprehensive test suites
5. **Documentation**: Improve guides and tutorials

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test thoroughly
npm run test

# Submit a pull request
git push origin feature/your-feature-name
```

---

## 📚 Resources

### Documentation
- [Uniswap V4 Hooks](https://docs.uniswap.org/contracts/v4/overview)
- [Inco Network](https://docs.inco.org/)
- [Base Network](https://docs.base.org/)
- [Wagmi Docs](https://wagmi.sh/)

### Related Projects
- [Uniswap V4 Periphery](https://github.com/Uniswap/v4-periphery)
- [Inco Gentry SDK](https://github.com/Inco-fhevm/inco-sdk)
- [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Uniswap Labs** for pioneering the hooks architecture in V4
- **Inco Network** for making TEE accessible on EVM chains
- **Base Team** for providing a fast and cheap Layer 2
- **The Ethereum Community** for endless inspiration

---

## 💬 Contact & Support

- **Twitter**: [@shadow_orders](https://x.com/RattiPrazwal)
- **Email**: prazwalr07@gmail.com

---

Built with ❤️ for the future of private DeFi
