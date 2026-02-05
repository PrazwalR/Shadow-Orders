# Deployment Summary

**Date**: February 3, 2026  
**Network**: Base Sepolia (Chain ID: 84532)

## Deployed Contracts

### ShadowOrdersHook
- **Address**: `0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4`
- **Deployer**: `0xaE0CCAC79AfFE82c8d736b1Eaa8351fe9E0f1A23`
- **Factory**: `0x11cF8779134f05E78D24Ae342c49b1f4ce18E5Ce`
- **Salt**: `0x00000000000000000000000000000000000000000000000000000000000052d3`
- **Flags**: `0xC4` (BEFORE_SWAP | AFTER_SWAP | AFTER_SWAP_RETURNS_DELTA)
- **Funded**: 0.1 ETH (block 37185659)
- **TX**: `0x3bf2cdaefc5920142217ac8a41802dc4856746582c23356b4190a4d4fc8e17f5`

### Configuration
- **PoolManager**: `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`
- **Keeper Address**: `0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a`
- **Inco Singleton**: `0x168FDc3Ae19A5d5b03614578C58974FF30FCBe92`

## Deployment Process

1. Created HookFactory contract for CREATE2 deployment
2. Mined address with correct permission flags (22 iterations)
3. Deployed ShadowOrdersHook via factory
4. Verified address matches mined address ✓
5. Funded hook with 0.1 ETH for FHE fees ✓

## Verification

```bash
# Check contract code
cast code 0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4 --rpc-url $BASE_SEPOLIA_RPC

# Check balance
cast balance 0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4 --rpc-url $BASE_SEPOLIA_RPC
# Result: 0.1 ETH ✓

# Verify tests
forge test
# Test result: ok. 13 passed; 0 failed ✓
```

## Next Steps

- [x] Deploy contract
- [x] Fund hook
- [x] Create keeper bot
- [x] Test suite (13/13 passing)
- [ ] Create test orders
- [ ] Test end-to-end flow
- [ ] Build frontend UI

## Keeper Bot

**Status**: Implemented ✓  
**Mode**: DEMO (simulated prices)  
**Monitoring**: Every 12 seconds  
**Features**:
- Event listening for OrderCreated
- FHE execution validation
- Automatic order execution
- Gas optimization

## Technical Notes

### Hook Permissions
The hook address must have EXACTLY these flags:
- Bit 7 (0x80): BEFORE_SWAP
- Bit 6 (0x40): AFTER_SWAP  
- Bit 2 (0x04): AFTER_SWAP_RETURNS_DELTA
- Total: 0xC4 = 196 decimal

All other flags (bits 0-1, 3-5, 8-13) must be zero for validation to pass.

### FHE Operations
- `createOrder`: 3 FHE ops (0.0003 ETH)
  - 2x `newEuint256` (price, amount)
  - 1x `newEbool` (buy/sell)
- `checkOrderExecutable`: FHE comparison (no cost to keeper)
- `executeOrder`: Validates & executes swap

### MEV Protection
- Buy orders: Execute at ≤98% of limit price
- Sell orders: Execute at ≥102% of limit price
- 2% buffer prevents sandwich attacks

## Gas Consumption

**Deployment**: ~4.3M gas  
**Create Order**: ~150k gas + 0.0003 ETH (FHE)  
**Execute Order**: ~200k gas  
**Cancel Order**: ~50k gas

## Environment

All configuration in single `.env` file at project root:

```env
PRIVATE_KEY=0x...
KEEPER_PRIVATE_KEY=0x...
KEEPER_ADDRESS=0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a
POOL_MANAGER=0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408
SHADOW_ORDERS_HOOK=0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4
BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/...
```

## Resources

- Base Sepolia Explorer: https://sepolia.basescan.org/address/0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4
- Uniswap V4 Docs: https://docs.uniswap.org/contracts/v4/overview
- Inco Docs: https://docs.inco.org

---

**Status**: ✅ DEPLOYED & OPERATIONAL  
**Remaining Balance**: 0.048 ETH (deployer)
