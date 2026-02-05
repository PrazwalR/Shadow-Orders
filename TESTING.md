# Testing Guide

## Unit Tests (Foundry)

All 13 tests passing ✅

```bash
cd contracts
forge test -vv
```

### Test Coverage

1. **Order Creation**
   - `testCreateOrder` - Basic order creation
   - `testCreateMultipleOrders` - Multiple orders from same user
   - `testCreateOrderInsufficientFee` - Revert on low fee

2. **Order Cancellation**
   - `testCancelOrder` - Owner cancels their order
   - `testCancelOrderNotOwner` - Non-owner cannot cancel
   - `testCancelOrderAlreadyCancelled` - Cannot cancel twice

3. **Keeper Management**
   - `testSetKeeper` - Update keeper address
   - `testSetKeeperNotKeeper` - Only keeper can update
   - `testSetKeeperZeroAddress` - Cannot set zero address

4. **Order Execution**
   - `testCheckOrderExecutableBuyOrder` - Validates buy order logic
   - `testCheckOrderExecutableSellOrder` - Validates sell order logic

5. **Fee Handling**
   - `testRefundExcessFee` - Returns excess ETH
   - `testReceiveETH` - Contract can receive ETH

## Integration Testing

### 1. Start Keeper Bot

```bash
cd keeper
npm start
```

Expected output:
```
🤖 Shadow Orders Keeper Bot
============================
Mode: 🎮 DEMO
Keeper: 0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a
Hook: 0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4
============================

⏳ Starting keeper bot...
📊 Loading orders... (0 to 0)
✅ Loaded 0 active orders
✅ Keeper bot running...
```

### 2. Create Test Order

Option A - Using Forge Script (requires FHE SDK integration):
```bash
cd contracts
forge script script/CreateTestOrder.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

Option B - Using Cast (direct call):
```bash
# Get current order count
cast call $SHADOW_ORDERS_HOOK "nextOrderId()" --rpc-url $BASE_SEPOLIA_RPC

# Create order (requires proper FHE ciphertext encoding)
# This will fail without proper Inco SDK integration:
cast send $SHADOW_ORDERS_HOOK "createOrder((address,address,uint24,int24,address),bytes,bytes,bytes)" \
  --value 0.0003ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $BASE_SEPOLIA_RPC
```

### 3. Monitor Keeper

Keeper should detect the order:
```
📝 New order created: #0
   Owner: 0x...
   Pool: 0x...
🔍 Monitoring 1 orders...
```

### 4. Test Execution

When price conditions are met (in DEMO mode):
```
🎯 Order #0 is executable at price 3000.0
   Executing order...
   TX: 0x...
   ✅ Order executed! Gas used: 200000
```

## Manual Testing Checklist

- [ ] Hook contract deployed and verified
- [ ] Hook funded with 0.1 ETH
- [ ] Keeper bot starts without errors
- [ ] Can create orders (with FHE SDK)
- [ ] Keeper detects new orders
- [ ] Keeper validates execution conditions
- [ ] Orders execute successfully
- [ ] Keeper receives fee
- [ ] Can cancel orders
- [ ] Only owner can cancel
- [ ] Fee refunds work correctly

## FHE Testing (Requires Inco SDK)

**Note**: Full FHE testing requires Inco JavaScript SDK integration.

### Setup Inco SDK

```bash
npm install @inco/sdk
```

### Encrypt Order Data

```javascript
import { IncoSDK } from '@inco/sdk';

const sdk = new IncoSDK({
  rpcUrl: process.env.BASE_SEPOLIA_RPC,
  contractAddress: process.env.SHADOW_ORDERS_HOOK
});

// Encrypt order parameters
const limitPrice = await sdk.encrypt(ethers.parseUnits('2900', 18)); // $2900
const amount = await sdk.encrypt(ethers.parseUnits('1', 18)); // 1 ETH
const isBuyOrder = await sdk.encrypt(true);

// Create order with encrypted data
const tx = await hook.createOrder(
  poolKey,
  limitPrice.ciphertext,
  amount.ciphertext,
  isBuyOrder.ciphertext,
  { value: ethers.parseEther('0.0003') }
);
```

## Performance Testing

### Gas Benchmarks

```bash
forge test --gas-report
```

Expected results:
- createOrder: ~150,000 gas
- cancelOrder: ~50,000 gas
- executeOrder: ~200,000 gas

### Keeper Performance

Monitor keeper logs for:
- Event detection latency
- Execution time
- Gas usage per execution
- Success rate

## Troubleshooting

### Common Issues

**"OrderNotExecutable"**
- Price hasn't reached limit yet
- Check keeper logs for current price
- Verify 2% buffer calculation

**"InsufficientFee"**
- Increase msg.value to 0.0003 ETH minimum
- Each FHE operation costs ~0.0001 ETH

**"HookAddressNotValid"**
- Hook address must have correct permission flags (0xC4)
- Redeploy if address is incorrect

**Keeper not detecting orders**
- Check RPC connection
- Verify .env configuration
- Check event logs on BaseScan

### Debug Commands

```bash
# Check hook balance
cast balance $SHADOW_ORDERS_HOOK --rpc-url $BASE_SEPOLIA_RPC

# Check next order ID
cast call $SHADOW_ORDERS_HOOK "nextOrderId()" --rpc-url $BASE_SEPOLIA_RPC

# Check order details
cast call $SHADOW_ORDERS_HOOK "orders(uint256)" 0 --rpc-url $BASE_SEPOLIA_RPC

# Check keeper address
cast call $SHADOW_ORDERS_HOOK "keeper()" --rpc-url $BASE_SEPOLIA_RPC
```

## Test Network Resources

- **Base Sepolia Faucet**: https://www.alchemy.com/faucets/base-sepolia
- **Explorer**: https://sepolia.basescan.org
- **RPC**: https://sepolia.base.org

## Security Testing

⚠️ **DO NOT TEST WITH REAL FUNDS**

This is a testnet deployment for hackathon purposes only.

For production:
- Complete security audit
- Test with small amounts first
- Monitor for 24-48 hours
- Implement emergency pause mechanism
- Add multi-sig for keeper management

---

**Status**: Ready for Testing ✓  
**Test Coverage**: 13/13 passing  
**Keeper**: Implemented & Running
