# Shadow Orders

Privacy-preserving limit orders on Uniswap V4 using Inco FHE encryption.

## Overview

Shadow Orders enables encrypted limit orders on Uniswap V4 without revealing trading strategies. Order details (price, amount, direction) remain encrypted on-chain using Fully Homomorphic Encryption (FHE) from Inco Network.

## Deployment Status

**Live on Base Sepolia** ✅

### Core Contracts
- **ShadowOrdersHook**: `0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4`
- **PoolManager**: `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`  
- **Keeper**: `0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a`
- **Hook Funded**: 0.1 ETH (~1000 orders)

### Mock Tokens (for testing)
| Token | Address | Decimals |
|-------|---------|----------|
| mUSDC | `0x0e89F47C600bd253838F052795ca5dC41B932115` | 6 |
| mDAI | `0x78176aBA471cD5D5e4994907C2D0b9650bd48d58` | 18 |
| mWBTC | `0x21C40b2865699F05A8aFBc59230939dD88B589aC` | 8 |
| mLINK | `0x3438793a8A8e7843851519846CdceDa5B43801Ca` | 18 |
| mWETH | `0x249518Cf9609378c6aF940C9FB8E31b42738aC31` | 18 |

### Live Pools with Liquidity
| Pool | Pool ID | Pair |
|------|---------|------|
| 1 | `0xa4d7fc...b247` | mUSDC/mWETH |
| 2 | `0x9f5f7d...00ab` | mWETH/mDAI |
| 3 | `0x612871...26fe` | mWBTC/mWETH |
| 4 | `0x815c58...db8d` | mWETH/mLINK |

## Quick Start

```bash
# Install dependencies
cd contracts && forge install
cd ../keeper && npm install

# Run tests
cd contracts && forge test
# Test result: ok. 13 passed; 0 failed ✓

# Run keeper bot
cd keeper && npm start
```

## How It Works

1. **Create**: User encrypts order via Inco SDK → calls `createOrder()`
2. **Monitor**: Keeper listens for `OrderCreated` events  
3. **Check**: FHE validates execution conditions on-chain
4. **Execute**: Keeper triggers swap via Uniswap V4 hooks
5. **Reward**: Keeper earns 0.1% fee

## Key Features

- **Privacy**: FHE-encrypted prices and amounts
- **MEV Protection**: 2% execution buffer
- **Contract-Paid**: Hook pays FHE fees (not users)
- **Zero Trust**: No decryption keys needed
- **Production Ready**: All tests passing, deployed & funded

## Architecture

```
contracts/          # Foundry project
├── src/
│   └── ShadowOrdersHook.sol    # Main hook (417 lines)
├── test/                        # 13/13 tests passing
└── script/Deploy.s.sol         # Deployment w/ address mining

keeper/            # Node.js keeper bot
└── src/index.js  # Event monitoring & execution

.env              # Single config file
```

## Gas & Fees

| Operation | Gas | FHE Fee |
|-----------|-----|---------|
| Create Order | ~150k | 0.0003 ETH |
| Cancel Order | ~50k | - |
| Execute Order | ~200k | - |

## Testing

All 13 unit tests passing:
- Order creation/cancellation ✓
- Keeper management ✓  
- FHE execution validation ✓
- MEV buffer (2%) ✓
- Fee handling & refunds ✓

## Built For

- Uniswap V4 Hooks ($10k prize)
- Inco FHE ($5k prize)

## Security

⚠️ Testnet only - DO NOT use with real funds

---

MIT License | Hackathon Project 2026
