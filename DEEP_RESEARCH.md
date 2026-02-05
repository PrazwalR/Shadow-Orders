# 🔬 **SHADOW ORDERS: Deep Research Documentation**

## **Comprehensive Protocol Research & Technical Specifications**

---

# 📑 **Table of Contents**

1. [Uniswap V4 Deep Dive](#uniswap-v4)
2. [Yellow Network Deep Dive](#yellow-network)
3. [1inch Protocol Suite](#1inch-protocol)
4. [Integration Architecture](#integration)
5. [Contract Addresses & Deployments](#deployments)
6. [SDK Code Examples](#sdk-examples)

---

<a name="uniswap-v4"></a>
# 1. 🦄 **Uniswap V4 Deep Dive**

## Core Architecture Changes (V4 vs V3)

### Singleton Design Pattern

| Aspect | V3 | V4 |
|--------|----|----|
| Pool Creation | New contract per pool | State update in singleton |
| Gas for Pool Creation | ~4.5M gas | ~500K gas |
| Multi-hop Swaps | Token transfers between pools | Internal accounting only |
| Contract Address | Different per pool | `PoolManager` singleton |

### Flash Accounting

**Key Concept**: In V4, token transfers only happen at the BEGINNING and END of a transaction, not between operations.

```
V3 Multi-hop (ETH → USDC → DAI):
1. Transfer ETH to ETH/USDC pool
2. Transfer USDC from ETH/USDC pool to USDC/DAI pool  
3. Transfer DAI from USDC/DAI pool to user
= 3 external transfers

V4 Multi-hop (Same swap):
1. Call swap() on ETH/USDC - updates delta
2. Call swap() on USDC/DAI - uses USDC delta as input
3. Settle: User pays ETH, receives DAI
= 2 external transfers (infinite hops still = 2 transfers)
```

### Locking Mechanism

```solidity
// To interact with PoolManager, you must:
1. Call unlock() on PoolManager
2. PoolManager calls your unlockCallback()
3. Inside callback, perform operations (swap, modifyLiquidity, etc.)
4. Return from callback
5. PoolManager verifies all deltas are settled (net zero)
```

### Available Hook Points

| Hook | When Called | Can Modify |
|------|-------------|------------|
| `beforeInitialize` | Before pool creation | Pool parameters |
| `afterInitialize` | After pool creation | N/A |
| `beforeAddLiquidity` | Before LP adds | Can block |
| `afterAddLiquidity` | After LP adds | Fee accounting |
| `beforeRemoveLiquidity` | Before LP removes | Can block |
| `afterRemoveLiquidity` | After LP removes | Fee accounting |
| `beforeSwap` | Before swap | Fee, delta amounts |
| `afterSwap` | After swap | Fee accounting |
| `beforeDonate` | Before donation | Can block |
| `afterDonate` | After donation | N/A |

### Dynamic Fees

```solidity
// Fee range: 0% to 100% (0 to 1,000,000 pips)
// 1 basis point = 100 pips
// Dynamic fee flag: 0x800000

// To enable dynamic fees:
PoolKey memory key = PoolKey({
    currency0: token0,
    currency1: token1,
    fee: 0x800000, // Dynamic fee flag
    tickSpacing: 60,
    hooks: myHook
});

// Hook can update fee per-swap:
function beforeSwap(...) returns (bytes4, BeforeSwapDelta, uint24) {
    uint24 newFee = calculateDynamicFee();
    return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, newFee);
}
```

### Fee Structure (V4)

```
Swap Fee = Protocol Fee + (LP Fee × (1 - Protocol Fee / 1,000,000))

Example:
- Protocol Fee: 50 pips (0.005%)
- LP Fee: 3000 pips (0.30%)
- Swap Fee: 50 + 3000 - (50 × 3000) / 1,000,000
           = 50 + 3000 - 0.15
           = 3049.85 pips (0.304985%)
```

### ERC-6909 Token Standard

```solidity
// Instead of transferring ERC-20s in/out of PoolManager,
// users can opt to receive ERC-6909 claim tokens

// Benefits:
// - No external ERC-20 transfers (gas savings)
// - Can burn claims in future transactions
// - Ideal for high-frequency traders/MEV bots
```

### Native ETH Support

V4 natively supports ETH (not WETH) in pools:
- No wrapping/unwrapping gas
- Cheaper transfers
- ETH address: `address(0)` in PoolKey

---

<a name="yellow-network"></a>
# 2. 🟡 **Yellow Network Deep Dive**

## What is Nitrolite?

Nitrolite is the state channel protocol powering Yellow Network. It enables:
- Off-chain interactions with minimal on-chain operations
- A unified virtual ledger ("clearnet") for applications
- EVM-compatible, deployed on L1 and L2 Ethereum networks

## Three Protocol Layers

```
┌─────────────────────────────────────────┐
│        Application Layer                │
│   (Arbitrary app logic - trading, etc.) │
├─────────────────────────────────────────┤
│        Off-Chain RPC Layer              │
│   (Fast, gasless state updates)         │
├─────────────────────────────────────────┤
│   On-Chain Smart Contract Layer         │
│   (Fund custody, disputes, settlement)  │
├─────────────────────────────────────────┤
│           Blockchain                    │
└─────────────────────────────────────────┘
```

## Core Concepts

### State Channels vs L1/L2

| Aspect | L1 | L2 (Rollups) | State Channels (Yellow) |
|--------|----|--------------|-----------------------|
| Transaction Speed | 12-15 seconds | 2-10 seconds | < 1 second |
| Gas Cost | High | Medium | Zero (off-chain) |
| Security | Full L1 security | Fraud/validity proofs | Challenge-response |
| Finality | ~6 minutes | ~7 days (optimistic) | Instant (off-chain) |
| Data Availability | On-chain | On-chain | Off-chain |

### App Sessions

Multi-party application channels with:
- Custom governance rules
- Flexible state management
- Arbitrary participant weights
- Configurable quorum requirements

```javascript
const appDefinition = {
    protocol: 'shadow-orders-v1',
    participants: [trader, marketMaker],
    weights: [50, 50],     // Equal participation
    quorum: 100,           // Both must agree
    challenge: 86400,      // 24h challenge period
    nonce: Date.now()
};
```

### Session Keys

Delegated keys for secure, gasless interactions:
- No repeated wallet prompts
- Scoped permissions
- Time-limited validity

### Challenge-Response Mechanism

If counterparty goes offline or tries to cheat:

```
1. Submit latest signed state to custody contract
2. Challenge period starts (e.g., 24 hours)
3. Counterparty can submit newer state if they have one
4. After challenge period, funds released according to final state
5. If no response, challenger gets their funds back
```

### Message Envelope Format (Nitro RPC)

```javascript
{
    "jsonrpc": "2.0",
    "method": "app_session",
    "params": {
        "definition": appDefinition,
        "allocations": allocations,
        "signature": "0x..."
    },
    "id": 1
}
```

## SDK Integration

### Installation

```bash
npm install @erc7824/nitrolite
```

### Connection

```javascript
import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';

// Production: wss://clearnet.yellow.com/ws
// Sandbox:    wss://clearnet-sandbox.yellow.com/ws
const ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');
```

### Creating Sessions

```javascript
const allocations = [
    { participant: trader, asset: 'usdc', amount: '1000000' },      // 1 USDC
    { participant: marketMaker, asset: 'usdc', amount: '1000000' } // 1 USDC
];

const sessionMessage = await createAppSessionMessage(
    messageSigner,
    [{ definition: appDefinition, allocations }]
);

ws.send(sessionMessage);
```

### Instant Payments

```javascript
async function sendPayment(ws, messageSigner, amount, recipient) {
    const paymentData = {
        type: 'payment',
        amount: amount.toString(),
        recipient,
        timestamp: Date.now()
    };

    const signature = await messageSigner(JSON.stringify(paymentData));
    
    ws.send(JSON.stringify({
        ...paymentData,
        signature,
        sender: myAddress
    }));
    
    console.log('💸 Payment sent instantly!');
}
```

---

<a name="1inch-protocol"></a>
# 3. 🔴 **1inch Protocol Suite**

## API Products Overview

| API | Purpose | Key Feature |
|-----|---------|-------------|
| **Swap API** | Execute swaps | 3 modes: Classic, Intent (Fusion), Cross-chain |
| **Orderbook API** | Limit orders | Off-chain storage, on-chain execution |
| **Spot Price API** | Token prices | Aggregated from 100+ DEXs |
| **Portfolio API** | Wallet analytics | Multi-chain, multi-wallet |
| **Balance API** | Token balances | Real-time, < 400ms response |
| **Gas Price API** | Gas estimates | < 200ms response |
| **History API** | Transaction history | All tx types classified |
| **Token API** | Token metadata | Search by name/symbol/address |
| **Transaction Gateway** | Tx broadcasting | Public + private mempool |
| **Web3 RPC API** | Blockchain connection | Full + archive nodes |

## Swap Execution Modes

### Classic Swap
- Direct transaction execution
- Maximum parameter control
- Immediate execution
- Best for: Advanced trading logic

### Intent-Based Swap (Fusion)
- Gasless execution
- MEV protection
- Resolver network fills orders
- Best for: Large/price-sensitive trades

### Cross-Chain Swap (Fusion+)
- EVM ↔ EVM swaps
- EVM ↔ Solana swaps
- No manual bridging
- Best for: Multi-chain applications

## Spot Price API

### Contract Address
```
0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8

Deployed on ALL chains:
- Ethereum (1)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- Polygon (137)
- BSC (56)
- Avalanche (43114)
- Gnosis (100)
- zkSync (324)
- Linea (59144)
- Sonic (146)
- Unichain (130)
```

### Interface

```solidity
interface IOffchainOracle {
    function getRate(
        address srcToken,
        address dstToken,
        bool useWrappers
    ) external view returns (uint256 weightedRate);
    
    function getRateToEth(
        address srcToken,
        bool useWrappers
    ) external view returns (uint256 weightedRate);
}
```

### REST API

```bash
# Get prices for whitelisted tokens
GET https://api.1inch.com/price/v1.1/{chainId}

# Headers
Authorization: Bearer YOUR_API_KEY

# Response time: < 300ms
```

## Orderbook API (Limit Orders)

### Limit Order Protocol Features

- **Partial fills**: Orders can be filled incrementally
- **Predicates**: Conditional execution (price bounds, time constraints)
- **Single cancellation**: Cancel by order hash
- **Batch cancellation**: Invalidate multiple orders at once
- **Validation**: Custom on-chain validation logic

### Order Execution Flow

```
1. User creates order (off-chain)
2. User signs order (EIP-712)
3. Order submitted to Orderbook API
4. Anyone can fetch signed orders
5. Executor submits order to fillOrder() on-chain
6. Smart contract validates and executes
```

### Limit Order SDK

```javascript
import {
  LimitOrder,
  MakerTraits,
  Address,
  Sdk,
  randBigInt,
} from '@1inch/limit-order-sdk';

const sdk = new Sdk({
  authKey: '...',
  networkId: 1,
  httpConnector: new FetchProviderConnector(),
});

const order = await sdk.createOrder(
  {
    makerAsset: new Address('0xdac17f958d2ee523a2206206994597c13d831ec7'), // USDT
    takerAsset: new Address('0x111111111117dc0aa78b770fa6a738034120c302'), // 1INCH
    makingAmount: 100_000000n,    // 100 USDT
    takingAmount: 10_00000000000000000n, // 10 1INCH
    maker: new Address(maker.address),
  },
  makerTraits,
);

const signature = await maker.signTypedData(
  typedData.domain,
  { Order: typedData.types.Order },
  typedData.message,
);

await sdk.submitOrder(order, signature);
```

## Authentication

```bash
# Header method (recommended)
curl -X 'GET' \
  'https://api.1inch.com/swap/v5.2/1/tokens' \
  -H 'Authorization: Bearer YOUR_API_KEY'

# Query parameter method
curl -X 'GET' \
  'https://api.1inch.com/swap/v5.2/1/tokens?apiKey=YOUR_API_KEY'
```

---

<a name="deployments"></a>
# 4. 📍 **Contract Addresses & Deployments**

## Uniswap V4 Mainnet Deployments

### Ethereum (Chain ID: 1)
```
PoolManager:       0x000000000004444c5dc75cB358380D2e3dE08A90
PositionManager:   0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e
Quoter:            0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203
StateView:         0x7ffe42c4a5deea5b0fec41c94c136cf115597227
Universal Router:  0x66a9893cc07d91d95644aedd05d03f95e1dba8af
Permit2:           0x000000000022D473030F116dDEE9F6B43aC78BA3
```

### Arbitrum (Chain ID: 42161)
```
PoolManager:       0x360e68faccca8ca495c1b759fd9eee466db9fb32
PositionManager:   0xd88f38f930b7952f2db2432cb002e7abbf3dd869
Quoter:            0x3972c00f7ed4885e145823eb7c655375d275a1c5
StateView:         0x76fd297e2d437cd7f76d50f01afe6160f86e9990
Universal Router:  0xa51afafe0263b40edaef0df8781ea9aa03e381a3
```

### Base (Chain ID: 8453)
```
PoolManager:       0x498581ff718922c3f8e6a244956af099b2652b2b
PositionManager:   0x7c5f5a4bbd8fd63184577525326123b519429bdc
Quoter:            0x0d5e0f971ed27fbff6c2837bf31316121532048d
StateView:         0xa3c0c9b65bad0b08107aa264b0f3db444b867a71
Universal Router:  0x6ff5693b99212da76ad316178a184ab56d299b43
```

### Optimism (Chain ID: 10)
```
PoolManager:       0x9a13f98cb987694c9f086b1f5eb990eea8264ec3
PositionManager:   0x3c3ea4b57a46241e54610e5f022e5c45859a1017
Quoter:            0x1f3131a13296fb91c90870043742c3cdbff1a8d7
StateView:         0xc18a3169788f4f75a170290584eca6395c75ecdb
Universal Router:  0x851116d9223fabed8e56c0e6b8ad0c31d98b3507
```

### Polygon (Chain ID: 137)
```
PoolManager:       0x67366782805870060151383f4bbff9dab53e5cd6
PositionManager:   0x1ec2ebf4f37e7363fdfe3551602425af0b3ceef9
Quoter:            0xb3d5c3dfc3a7aebff71895a7191796bffc2c81b9
StateView:         0x5ea1bd7974c8a611cbab0bdcafcb1d9cc9b3ba5a
Universal Router:  0x1095692a6237d83c6a72f3f5efedb9a670c49223
```

## V4 Testnet Deployments

### Sepolia (Chain ID: 11155111)
```
PoolManager:           0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
Universal Router:      0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b
PositionManager:       0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4
StateView:             0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c
Quoter:                0x61b3f2011a92d183c7dbadbda940a7555ccf9227
PoolSwapTest:          0x9b6b46e2c869aa39918db7f52f5557fe577b6eee
PoolModifyLiquidityTest: 0x0c478023803a644c94c4ce1c1e7b9a087e411b0a
```

### Base Sepolia (Chain ID: 84532)
```
PoolManager:           0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408
Universal Router:      0x492e6456d9528771018deb9e87ef7750ef184104
PositionManager:       0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80
Quoter:                0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba
```

## 1inch Oracle Address
```
All Chains: 0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8
```

## Yellow Network Endpoints
```
Production: wss://clearnet.yellow.com/ws
Sandbox:    wss://clearnet-sandbox.yellow.com/ws
```

---

<a name="sdk-examples"></a>
# 5. 💻 **SDK Code Examples**

## Complete Shadow Orders Integration

### 1. Inco FHE Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint256, ebool, e} from "@inco/lightning/Lib.sol";

contract ShadowOrderBook {
    using e for *;
    
    struct EncryptedOrder {
        euint256 triggerPrice;
        euint256 amount;
        address trader;
        bytes32 yellowSessionId;
        bool active;
    }
    
    mapping(bytes32 => EncryptedOrder) public orders;
    address public oracle; // 1inch oracle
    
    constructor(address _oracle) {
        oracle = _oracle;
    }
    
    function createOrder(
        bytes32 orderId,
        euint256 encryptedTriggerPrice,
        euint256 encryptedAmount,
        bytes32 yellowSessionId
    ) external {
        orders[orderId] = EncryptedOrder({
            triggerPrice: encryptedTriggerPrice,
            amount: encryptedAmount,
            trader: msg.sender,
            yellowSessionId: yellowSessionId,
            active: true
        });
    }
    
    function checkTrigger(bytes32 orderId) external view returns (ebool) {
        EncryptedOrder storage order = orders[orderId];
        require(order.active, "Order not active");
        
        // Get current price from 1inch oracle
        uint256 currentPrice = IOracle(oracle).getRate(
            tokenA, tokenB, false
        );
        
        // Encrypted comparison - returns encrypted boolean
        euint256 encCurrentPrice = currentPrice.asEuint256();
        return e.le(encCurrentPrice, order.triggerPrice);
    }
    
    function executeOrder(bytes32 orderId, bool shouldExecute) external {
        require(shouldExecute, "Price condition not met");
        EncryptedOrder storage order = orders[orderId];
        order.active = false;
        
        // Emit event for Yellow Network to execute
        emit OrderTriggered(orderId, order.yellowSessionId);
    }
    
    event OrderTriggered(bytes32 indexed orderId, bytes32 yellowSessionId);
}

interface IOracle {
    function getRate(address srcToken, address dstToken, bool useWrappers) 
        external view returns (uint256);
}
```

### 2. Yellow Network Integration

```typescript
import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

class ShadowOrdersClient {
    private ws: WebSocket;
    private messageSigner: (msg: string) => Promise<string>;
    private address: string;
    
    constructor(address: string, signer: ethers.Signer) {
        this.address = address;
        this.messageSigner = async (message: string) => {
            return await signer.signMessage(message);
        };
    }
    
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');
            
            this.ws.onopen = () => {
                console.log('🟢 Connected to Yellow Network');
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('Connection error:', error);
                reject(error);
            };
            
            this.ws.onmessage = (event) => {
                const message = parseRPCResponse(event.data);
                this.handleMessage(message);
            };
        });
    }
    
    async createTradingSession(
        counterparty: string,
        depositAmount: bigint
    ): Promise<string> {
        const appDefinition = {
            protocol: 'shadow-orders-v1',
            participants: [this.address, counterparty],
            weights: [50, 50],
            quorum: 100,
            challenge: 86400, // 24 hours
            nonce: Date.now()
        };
        
        const allocations = [
            { participant: this.address, asset: 'usdc', amount: depositAmount.toString() },
            { participant: counterparty, asset: 'usdc', amount: '0' }
        ];
        
        const sessionMessage = await createAppSessionMessage(
            this.messageSigner,
            [{ definition: appDefinition, allocations }]
        );
        
        this.ws.send(sessionMessage);
        console.log('✅ Trading session created');
        
        return `session_${Date.now()}`;
    }
    
    async executeOrder(
        sessionId: string,
        orderDetails: {
            amount: bigint;
            tokenIn: string;
            tokenOut: string;
        }
    ): Promise<void> {
        const fillData = {
            type: 'order_fill',
            sessionId,
            ...orderDetails,
            timestamp: Date.now()
        };
        
        const signature = await this.messageSigner(JSON.stringify(fillData));
        
        this.ws.send(JSON.stringify({
            ...fillData,
            signature,
            sender: this.address
        }));
        
        console.log('💸 Order executed instantly!');
    }
    
    private handleMessage(message: any): void {
        switch (message.type) {
            case 'session_created':
                console.log('✅ Session confirmed:', message.sessionId);
                break;
            case 'order_filled':
                console.log('💰 Order filled:', message.amount);
                break;
            case 'error':
                console.error('❌ Error:', message.error);
                break;
        }
    }
}

// Usage
async function main() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    const client = new ShadowOrdersClient(address, signer);
    await client.connect();
    
    // Create trading session with market maker
    const sessionId = await client.createTradingSession(
        '0xMarketMakerAddress',
        1000000n // 1 USDC
    );
    
    // When order triggers, execute instantly
    await client.executeOrder(sessionId, {
        amount: 500000n,
        tokenIn: 'USDC',
        tokenOut: 'ETH'
    });
}
```

### 3. V4 Smart Routing Hook

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/src/base/hooks/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";

contract SmartRoutingHook is BaseHook {
    address public yellowCustody;
    address public oracle;
    
    constructor(
        IPoolManager _poolManager,
        address _yellowCustody,
        address _oracle
    ) BaseHook(_poolManager) {
        yellowCustody = _yellowCustody;
        oracle = _oracle;
    }
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,  // We use this
            afterSwap: true,   // For logging
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }
    
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Check if Yellow Network has better liquidity
        (bool useYellow, uint256 yellowPrice) = checkYellowLiquidity(
            key.currency0,
            key.currency1,
            params.amountSpecified
        );
        
        if (useYellow) {
            // Emit event for off-chain Yellow execution
            emit RouteToYellow(
                sender,
                address(key.currency0),
                address(key.currency1),
                params.amountSpecified,
                yellowPrice
            );
        }
        
        // Dynamic fee based on volatility/liquidity
        uint24 dynamicFee = calculateDynamicFee(key, params);
        
        return (
            this.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            dynamicFee
        );
    }
    
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) {
        emit SwapExecuted(
            sender,
            address(key.currency0),
            address(key.currency1),
            delta.amount0(),
            delta.amount1()
        );
        
        return (this.afterSwap.selector, 0);
    }
    
    function checkYellowLiquidity(
        Currency currency0,
        Currency currency1,
        int256 amount
    ) internal view returns (bool useYellow, uint256 price) {
        // Query Yellow Network liquidity
        // This would be an oracle call in production
        return (false, 0);
    }
    
    function calculateDynamicFee(
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params
    ) internal view returns (uint24) {
        // Base fee + volatility adjustment
        uint24 baseFee = 3000; // 0.30%
        
        // Query recent volatility from oracle
        uint256 volatility = getVolatility(key.currency0, key.currency1);
        
        // Higher volatility = higher fee to protect LPs
        if (volatility > 500) { // High volatility
            return baseFee + 2000; // 0.50% total
        } else if (volatility > 200) { // Medium volatility
            return baseFee + 500; // 0.35% total
        }
        
        return baseFee;
    }
    
    function getVolatility(Currency c0, Currency c1) internal view returns (uint256) {
        // Query volatility oracle
        return 100; // Placeholder
    }
    
    event RouteToYellow(
        address indexed sender,
        address token0,
        address token1,
        int256 amount,
        uint256 yellowPrice
    );
    
    event SwapExecuted(
        address indexed sender,
        address token0,
        address token1,
        int128 amount0,
        int128 amount1
    );
}
```

### 4. 1inch Oracle Integration

```typescript
import { ethers } from 'ethers';

const ORACLE_ADDRESS = '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8';

const ORACLE_ABI = [
    'function getRate(address srcToken, address dstToken, bool useWrappers) external view returns (uint256 weightedRate)',
    'function getRateToEth(address srcToken, bool useWrappers) external view returns (uint256 weightedRate)'
];

class PriceOracle {
    private contract: ethers.Contract;
    
    constructor(provider: ethers.Provider) {
        this.contract = new ethers.Contract(
            ORACLE_ADDRESS,
            ORACLE_ABI,
            provider
        );
    }
    
    async getPrice(
        srcToken: string,
        dstToken: string
    ): Promise<bigint> {
        const rate = await this.contract.getRate(srcToken, dstToken, false);
        return rate;
    }
    
    async getPriceInEth(token: string): Promise<bigint> {
        const rate = await this.contract.getRateToEth(token, false);
        return rate;
    }
    
    async checkPriceCondition(
        srcToken: string,
        dstToken: string,
        targetPrice: bigint
    ): Promise<boolean> {
        const currentPrice = await this.getPrice(srcToken, dstToken);
        return currentPrice <= targetPrice;
    }
}

// REST API alternative
async function fetchPrice(
    chainId: number,
    srcToken: string,
    dstToken: string,
    apiKey: string
): Promise<number> {
    const response = await fetch(
        `https://api.1inch.com/price/v1.1/${chainId}/${srcToken}/${dstToken}`,
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        }
    );
    
    const data = await response.json();
    return data.price;
}
```

---

# 🎯 **Summary**

This research document provides the complete technical foundation for building Shadow Orders:

1. **Uniswap V4**: Singleton PoolManager, hooks, flash accounting, dynamic fees
2. **Yellow Network**: Nitrolite state channels, instant execution, challenge-response security
3. **1inch**: Spot Price Oracle (same address all chains), Orderbook API, Limit Order SDK
4. **Integration**: All protocols compatible on Ethereum, Arbitrum, Base, Optimism, Polygon

**Key Contract Addresses to Remember:**
- 1inch Oracle: `0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8` (all chains)
- V4 PoolManager (Ethereum): `0x000000000004444c5dc75cB358380D2e3dE08A90`
- Yellow Sandbox: `wss://clearnet-sandbox.yellow.com/ws`

Ready to build! 🚀
