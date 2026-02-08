# Shadow Orders - Whiteboard Video Script (1:30)

## 🎬 Scene 1: THE PROBLEM (0:00 - 0:30)

**Visual:** Stick figure "Bob" + mempool + MEV bot

**Narration:**
> "This is Bob. Bob wants to buy 50 ETH at $2,000 per ETH."
> 
> "He signs a transaction and sends it to the mempool."
> 
> "But MEV bots are watching! They see Bob's order, front-run him by buying 20 ETH for $40,000."
> 
> "This pushes the price up to $2,100 per ETH."
> 
> "Now Bob pays $105,000 — that's $5,000 MORE than he expected."
> 
> "The bot sells for $42,000, making $2,000 profit."
> 
> "Bob loses $5,000 to MEV."

**Key Numbers on Screen:**
- Bob wants: 50 ETH @ $2,000 = $100,000
- Bot buys: 20 ETH @ $2,000 = $40,000
- Price spikes to: $2,100
- Bob pays: 50 ETH @ $2,100 = $105,000
- Bot sells: 20 ETH @ $2,100 = $42,000
- ❌ Bob's loss: -$5,000
- ✅ Bot's profit: +$2,000

---

## 🛡️ Scene 2: THE SOLUTION (0:30 - 0:55)

**Visual:** Bob → Encryption shield → Blockchain → ✓

**Narration:**
> "Introducing Shadow Orders."
> 
> "With Shadow Orders, Bob's order details are encrypted using Inco Lightning TEE."
> 
> "The price, amount, and direction are all hidden."
> 
> "MEV bots can't see what Bob is doing."
> 
> "The order is stored encrypted on-chain via Uniswap V4 hooks."
> 
> "When the market price hits Bob's limit, the order executes automatically."
> 
> "No front-running. No MEV losses. Privacy preserved."

**Key Points on Screen:**
- 🔒 Encrypted: Price, Amount, Direction
- 🚫 MEV bots: Can't see order details
- ✅ Bob pays: Exactly $100,000 (as intended)
- 🎯 Privacy-first trading

---

## ⚙️ Scene 3: HOW IT WORKS (0:55 - 1:30)

**Visual:** Architecture diagram flow

**Narration:**
> "Here's the workflow:"
> 
> "1. Bob enters his order in the browser"
> 
> "2. Inco Lightning encrypts it using TEE—Trusted Execution Environment"
> 
> "3. Encrypted order is sent to our Uniswap V4 hook on Base Sepolia"
> 
> "4. The smart contract stores the order—still encrypted"
> 
> "5. Decentralized keepers monitor the blockchain for price triggers"
> 
> "6. When Bob's price is reached, the keeper executes the swap"
> 
> "7. Bob gets his tokens at the exact price he wanted—MEV-free!"
> 
> "Built on Uniswap V4 hooks, Inco Lightning, and Base."

**Architecture Flow on Screen:**
```
User Browser
    ↓ (encrypt with Inco Lightning TEE)
Encrypted Order
    ↓ (via Uniswap V4)
ShadowOrdersHook.sol
    ↓ (stored on Base Sepolia)
Keeper Network
    ↓ (monitors & executes)
✅ Order Filled at Target Price
```

**Tech Stack Logos:**
- Uniswap V4
- Inco Network
- Base
- CoinGecko

---

## 🔄 DETAILED WORKFLOW DIAGRAM

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                         STEP 1: USER INPUT (Browser)                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ User enters order parameters:
                                       │ • tokenIn: USDC (0x036Cb...)
                                       │ • tokenOut: WETH (0x4200...)
                                       │ • amount: 1000 USDC
                                       │ • limitPrice: $2,900/ETH
                                       │ • isBuyOrder: true
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               STEP 2: CLIENT-SIDE ENCRYPTION (Inco Lightning TEE)             ┃
┃                                                                                ┃
┃  ┌─────────────────────────────────────────────────────────────────┐          ┃
┃  │  const lightning = await Lightning.latest("testnet", 84532)     │          ┃
┃  │                                                                  │          ┃
┃  │  // Encrypt each parameter separately                           │          ┃
┃  │  encryptedPrice  = lightning.encrypt64(2900)                    │          ┃
┃  │  encryptedAmount = lightning.encrypt64(1000000000)              │          ┃
┃  │  encryptedDirection = lightning.encryptBool(true)               │          ┃
┃  └─────────────────────────────────────────────────────────────────┘          ┃
┃                                                                                ┃
┃  📦 OUTPUT (Encrypted Ciphertexts):                                           ┃
┃     • encryptedPrice: 0x8a9f7e3c... (256 bytes)                               ┃
┃     • encryptedAmount: 0x2b4d8f1a... (256 bytes)                              ┃
┃     • encryptedDirection: 0x5e7c9d2b... (256 bytes)                           ┃
┃                                                                                ┃
┃  🔒 TEE ensures: No one can decrypt these values!                             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ User signs transaction
                                       │ Fee: 0.0003 ETH (TEE computation)
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           STEP 3: TRANSACTION SUBMISSION (Base Sepolia Blockchain)            ┃
┃                                                                                ┃
┃  Transaction sent to: ShadowOrdersHook.sol                                    ┃
┃  Contract Address: 0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4                ┃
┃                                                                                ┃
┃  Function Call: createOrder()                                                 ┃
┃  ├─ Parameter 1: encryptedPrice (0x8a9f7e3c...)                               ┃
┃  ├─ Parameter 2: encryptedAmount (0x2b4d8f1a...)                              ┃
┃  ├─ Parameter 3: encryptedDirection (0x5e7c9d2b...)                           ┃
┃  ├─ Parameter 4: tokenIn (USDC address)                                       ┃
┃  ├─ Parameter 5: tokenOut (WETH address)                                      ┃
┃  └─ Value: 0.0003 ETH                                                         ┃
┃                                                                                ┃
┃  ⛓️  Broadcast to Base Sepolia Network                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ Transaction confirmed
                                       │ Block time: ~2 seconds
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              STEP 4: SMART CONTRACT STORAGE (ShadowOrdersHook.sol)            ┃
┃                                                                                ┃
┃  ┌──────────────────────────────────────────────────────────────┐             ┃
┃  │  struct Order {                                               │             ┃
┃  │      address user;              // Bob's wallet address      │             ┃
┃  │      uint256 encryptedPrice;    // 0x8a9f7e3c... 🔒          │             ┃
┃  │      uint256 encryptedAmount;   // 0x2b4d8f1a... 🔒          │             ┃
┃  │      bool encryptedDirection;   // 0x5e7c9d2b... 🔒          │             ┃
┃  │      address tokenIn;            // USDC                     │             ┃
┃  │      address tokenOut;           // WETH                     │             ┃
┃  │      uint256 timestamp;          // Block timestamp          │             ┃
┃  │      bool isActive;              // true                     │             ┃
┃  │  }                                                            │             ┃
┃  └──────────────────────────────────────────────────────────────┘             ┃
┃                                                                                ┃
┃  📝 Order stored in contract state:                                           ┃
┃     orders[orderId] = newOrder                                                ┃
┃                                                                                ┃
┃  🔐 Critical: MEV bots see the transaction but CANNOT decode:                 ┃
┃     • What price Bob wants                                                    ┃
┃     • How much Bob is buying                                                  ┃
┃     • Buy or sell direction                                                   ┃
┃                                                                                ┃
┃  ✅ Event Emitted: OrderCreated(orderId, user, tokenIn, tokenOut)            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ Order now live on-chain
                                       │ Status: Pending → Active
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   STEP 5: PRICE MONITORING (Multiple Systems)                 ┃
┃                                                                                ┃
┃  ┌─────────────────────────┐      ┌────────────────────────────┐             ┃
┃  │   FRONTEND SIMULATION   │      │   KEEPER MONITORING         │             ┃
┃  │   (Visual Progress)     │      │   (Real Execution)          │             ┃
┃  │                         │      │                             │             ┃
┃  │  • Fetch CoinGecko API  │      │  • Watch blockchain events  │             ┃
┃  │  • Current: $3,100/ETH  │      │  • Query Uniswap V4 pools  │             ┃
┃  │  • Target: $2,900/ETH   │      │  • Check order conditions  │             ┃
┃  │  • Gap: -6.5%           │      │  • Validate gas prices     │             ┃
┃  │                         │      │                             │             ┃
┃  │  Simulate price drop:   │      │  Poll every block (~2s):   │             ┃
┃  │  $3,100 → $3,000 →      │      │  if (currentPrice <=       │             ┃
┃  │  $2,950 → $2,900 ✓      │      │      encryptedPrice) {     │             ┃
┃  │                         │      │      triggerOrder()         │             ┃
┃  │  Update UI progress bar │      │  }                          │             ┃
┃  └─────────────────────────┘      └────────────────────────────┘             ┃
┃                                                                                ┃
┃  📊 Price Movement (Simulated for demo):                                      ┃
┃     Start:  $3,100 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [100%]                  ┃
┃     -3%:    $3,007 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [90%]                     ┃
┃     -5%:    $2,945 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [75%]                        ┃
┃     -6.5%:  $2,900 ━━━━━━━━━━━━━━━━━━━━━━━━━ [0%] ✅ TARGET REACHED!          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ Price condition met!
                                       │ Current price ≤ Target price
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃            STEP 6: ORDER TRIGGER (Uniswap V4 beforeSwap Hook)                 ┃
┃                                                                                ┃
┃  ┌───────────────────────────────────────────────────────────────┐            ┃
┃  │  function beforeSwap(                                          │            ┃
┃  │      address sender,                                           │            ┃
┃  │      PoolKey calldata key,                                     │            ┃
┃  │      IPoolManager.SwapParams calldata params                   │            ┃
┃  │  ) external override returns (bytes4) {                        │            ┃
┃  │                                                                 │            ┃
┃  │      // Check all active orders for this pool                  │            ┃
┃  │      for (uint i = 0; i < orderCount; i++) {                   │            ┃
┃  │          Order storage order = orders[i];                      │            ┃
┃  │                                                                 │            ┃
┃  │          // Compare encrypted price with current price         │            ┃
┃  │          bool triggered = checkCondition(                      │            ┃
┃  │              order.encryptedPrice,                             │            ┃
┃  │              getCurrentPrice(key.currency0, key.currency1)     │            ┃
┃  │          );                                                     │            ┃
┃  │                                                                 │            ┃
┃  │          if (triggered && order.isActive) {                    │            ┃
┃  │              emit OrderTriggered(                              │            ┃
┃  │                  i,                                             │            ┃
┃  │                  order.user,                                   │            ┃
┃  │                  order.tokenIn,                                │            ┃
┃  │                  order.tokenOut                                │            ┃
┃  │              );                                                 │            ┃
┃  │              order.isActive = false; // Mark as triggered      │            ┃
┃  │          }                                                      │            ┃
┃  │      }                                                          │            ┃
┃  │                                                                 │            ┃
┃  │      return this.beforeSwap.selector;                          │            ┃
┃  │  }                                                              │            ┃
┃  └───────────────────────────────────────────────────────────────┘            ┃
┃                                                                                ┃
┃  🎯 Hook Integration with Uniswap V4:                                         ┃
┃     PoolManager → beforeSwap() → ShadowOrdersHook → Check Orders             ┃
┃                                                                                ┃
┃  📢 Event Detected by Keeper:                                                 ┃
┃     OrderTriggered(orderId=13, user=0xBob..., USDC→WETH)                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ Keeper listens to events
                                       │ Picks up OrderTriggered
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 STEP 7: KEEPER EXECUTION (Backend Service)                    ┃
┃                                                                                ┃
┃  ┌──────────────────────────────────────────────────────────────┐             ┃
┃  │  Keeper Wallet: 0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a   │             ┃
┃  │  Private Key: Stored securely server-side (env variable)     │             ┃
┃  └──────────────────────────────────────────────────────────────┘             ┃
┃                                                                                ┃
┃  EXECUTION STEPS:                                                             ┃
┃                                                                                ┃
┃  1️⃣  Parse OrderTriggered Event                                               ┃
┃     ├─ orderId: 13                                                            ┃
┃     ├─ user: 0xBob...                                                         ┃
┃     ├─ tokenIn: USDC (0x036Cb...)                                             ┃
┃     └─ tokenOut: WETH (0x4200...)                                             ┃
┃                                                                                ┃
┃  2️⃣  Pull Tokens from User (ERC20 approval required)                          ┃
┃     await USDC.transferFrom(                                                  ┃
┃         userAddress,    // Bob's wallet                                       ┃
┃         keeperAddress,  // 0x5E48...                                          ┃
┃         1000e6          // 1000 USDC                                          ┃
┃     )                                                                          ┃
┃                                                                                ┃
┃  3️⃣  Approve Pool Manager                                                     ┃
┃     await USDC.approve(                                                       ┃
┃         POOL_MANAGER,   // 0x7Da1...                                          ┃
┃         1000e6                                                                 ┃
┃     )                                                                          ┃
┃                                                                                ┃
┃  4️⃣  Execute Swap via PoolSwapTest                                            ┃
┃     const swapParams = {                                                      ┃
┃         zeroForOne: true,           // USDC → WETH direction                 ┃
┃         amountSpecified: -1000e6,   // Exact input: 1000 USDC                ┃
┃         sqrtPriceLimitX96: 0        // No price limit (market)               ┃
┃     }                                                                          ┃
┃                                                                                ┃
┃     await poolSwapTest.swap(                                                  ┃
┃         poolKey,          // USDC-WETH pool                                   ┃
┃         swapParams,                                                            ┃
┃         testSettings                                                           ┃
┃     )                                                                          ┃
┃                                                                                ┃
┃  5️⃣  Transfer Output Tokens to User                                           ┃
┃     Output: 0.344 WETH (worth ~$1,000 at $2,900/ETH)                         ┃
┃     await WETH.transfer(                                                      ┃
┃         userAddress,    // Bob's wallet                                       ┃
┃         344827586206896551  // 0.344 WETH in wei                              ┃
┃     )                                                                          ┃
┃                                                                                ┃
┃  💰 Gas Costs (paid by keeper):                                               ┃
┃     • Swap: ~300,000 gas                                                      ┃
┃     • Cost: ~$0.05 on Base                                                    ┃
┃     • Keeper incentive: Built into protocol                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ Swap executed successfully
                                       │ Transaction hash generated
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃             STEP 8: SWAP EXECUTION (Uniswap V4 Pool Manager)                  ┃
┃                                                                                ┃
┃  ┌────────────────────────────────────────────────────────────────┐           ┃
┃  │  Pool: USDC-WETH (0.3% fee tier)                               │           ┃
┃  │  Pool Address: Derived from poolKey hash                       │           ┃
┃  │                                                                 │           ┃
┃  │  Before Swap:                                                  │           ┃
┃  │  ├─ USDC Reserve: 1,000,000                                    │           ┃
┃  │  ├─ WETH Reserve: 344.82                                       │           ┃
┃  │  └─ Price: $2,900/ETH                                          │           ┃
┃  │                                                                 │           ┃
┃  │  Swap Execution:                                               │           ┃
┃  │  ├─ Input: 1,000 USDC                                          │           ┃
┃  │  ├─ Fee: 3 USDC (0.3%)                                         │           ┃
┃  │  └─ Net Input: 997 USDC                                        │           ┃
┃  │                                                                 │           ┃
┃  │  After Swap:                                                   │           ┃
┃  │  ├─ USDC Reserve: 1,001,000                                    │           ┃
┃  │  ├─ WETH Reserve: 344.476                                      │           ┃
┃  │  ├─ Price: $2,902.78/ETH (slight increase)                    │           ┃
┃  │  └─ Output: 0.344 WETH sent to Bob                            │           ┃
┃  │                                                                 │           ┃
┃  │  Hook Callbacks Executed:                                     │           ┃
┃  │  beforeSwap() → ShadowOrdersHook (check conditions)           │           ┃
┃  │  swap()       → Pool calculation                              │           ┃
┃  │  afterSwap()  → ShadowOrdersHook (post-processing)            │           ┃
┃  └────────────────────────────────────────────────────────────────┘           ┃
┃                                                                                ┃
┃  ⛓️  Transaction Details:                                                      ┃
┃     TX Hash: 0x3536841bdf0fb9456509db7077a81d3912b01abda9233...               ┃
┃     Block: 14,829,192                                                         ┃
┃     Status: ✅ Success                                                         ┃
┃     Gas Used: 287,453                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                       │
                                       │ Order complete!
                                       │ Update frontend
                                       ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                        STEP 9: CONFIRMATION & UI UPDATE                       ┃
┃                                                                                ┃
┃  ╔════════════════════════════════════════════════════════════╗               ┃
┃  ║  🎉 ORDER EXECUTED SUCCESSFULLY!                           ║               ┃
┃  ╠════════════════════════════════════════════════════════════╣               ┃
┃  ║                                                             ║               ┃
┃  ║  Order ID: #13                                             ║               ┃
┃  ║  Status: ✅ Executed                                        ║               ┃
┃  ║                                                             ║               ┃
┃  ║  ┌─────────────────────────────────────────────┐           ║               ┃
┃  ║  │  You Paid:   1,000 USDC                     │           ║               ┃
┃  ║  │  You Got:    0.344 WETH                     │           ║               ┃
┃  ║  │  Rate:       $2,906/ETH                     │           ║               ┃
┃  ║  │  Target:     $2,900/ETH ✓                   │           ║               ┃
┃  ║  │  Slippage:   0.2% (within tolerance)        │           ┃               ║
┃  ║  └─────────────────────────────────────────────┘           ║               ┃
┃  ║                                                             ║               ┃
┃  ║  Transaction Hashes:                                       ║               ┃
┃  ║  📝 Order TX (TEE): 0x635055ffba...                        ║               ┃
┃  ║  💱 Swap TX: 0x3536841bdf...                               ║               ┃
┃  ║                                                             ║               ┃
┃  ║  🔒 Privacy Preserved:                                     ║               ┃
┃  ║  ✓ MEV bots couldn't front-run                            ║               ┃
┃  ║  ✓ Order price stayed encrypted                           ║               ┃
┃  ║  ✓ Executed at your target price                          ║               ┃
┃  ║                                                             ║               ┃
┃  ║  [View on BaseScan] [Create Another Order]                ║               ┃
┃  ╚════════════════════════════════════════════════════════════╝               ┃
┃                                                                                ┃
┃  💼 Bob's Final Balance:                                                      ┃
┃     • USDC: 9,000 (started with 10,000)                                       ┃
┃     • WETH: 0.444 (started with 0.1)                                          ┃
┃     • Total Value: ~$10,290 (profit from market timing!)                      ┃
┃                                                                                ┃
┃  🎯 Mission Accomplished:                                                     ┃
┃     Bob bought 0.344 WETH at his target price of $2,900                       ┃
┃     No MEV extraction, no front-running, full privacy! 🥷                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 📊 KEY COMPONENTS BREAKDOWN

### 🔐 Inco Lightning TEE
**Purpose:** Client-side encryption of sensitive order data

**Technology:** Trusted Execution Environment (hardware-based)
- Secure enclave processing
- Keys never leave secure memory
- Fast encryption (~100ms per value)
- Quantum-resistant algorithms

**What Gets Encrypted:**
1. `limitPrice` → 64-bit encrypted integer
2. `amount` → 64-bit encrypted integer  
3. `isBuyOrder` → Encrypted boolean

**Why TEE vs FHE:**
- ⚡ Faster: TEE is 100x faster than traditional FHE
- 🔒 Secure: Hardware-backed, tamper-proof
- 💰 Cheaper: Lower gas costs for verification
- 🚀 Practical: Works today, scales well

---

### ⛓️ ShadowOrdersHook.sol
**Purpose:** Uniswap V4 hook for encrypted order management

**Location:** Deployed on Base Sepolia at `0x18a398ec...`

**Key Functions:**
```solidity
createOrder()      // Store encrypted orders
beforeSwap()       // Check orders before any swap
afterSwap()        // Update order state
cancelOrder()      // User cancels their order
executeOrder()     // Keeper triggers execution
```

**Hook Permissions:**
- `BEFORE_SWAP_FLAG`: Check orders on every swap
- `AFTER_SWAP_FLAG`: Update state after swaps
- Can modify pool state
- Integrated with PoolManager

**Storage:**
- Orders array (indexed by orderId)
- User → orderIds mapping
- Pool → orders mapping
- Efficient lookups by pool pair

---

### 🏊 Uniswap V4 Pool Manager
**Purpose:** DEX liquidity pool coordination

**How It Integrates:**
1. User initiates swap via `PoolSwapTest`
2. PoolManager calls `beforeSwap()` hook
3. ShadowOrdersHook checks if any orders trigger
4. If triggered, emits `OrderTriggered` event
5. Swap proceeds normally
6. PoolManager calls `afterSwap()` hook
7. Order state updated

**Pool Details:**
- USDC-WETH pool (0.3% fee)
- Concentrated liquidity
- Tick-based pricing
- Hook-enabled pool

---

### 🤖 Keeper Network
**Purpose:** Decentralized order execution service

**Current Implementation:**
- Single keeper (testnet demo)
- Server-side Node.js process
- Monitors blockchain events
- Executes swaps on behalf of users

**Future Roadmap:**
- Multiple keeper network
- Stake-based participation
- Gas fee reimbursement
- Keeper reputation system
- Incentive mechanisms

**Keeper Responsibilities:**
1. Monitor `OrderTriggered` events
2. Validate order is still active
3. Pull tokens from user (via approval)
4. Execute swap via Uniswap V4
5. Transfer output tokens to user
6. Handle errors & retries

---

## 🔒 SECURITY & PRIVACY GUARANTEES

### What MEV Bots CAN See:
✅ A transaction was submitted to ShadowOrdersHook
✅ User's wallet address (0xBob...)
✅ Token pair (USDC → WETH)
✅ Encrypted ciphertext blobs
✅ 0.0003 ETH fee paid

### What MEV Bots CANNOT See:
❌ Limit price ($2,900)
❌ Order size (1,000 USDC)
❌ Buy/sell direction
❌ When order will execute
❌ Profit opportunity

### Result:
🎯 **Zero front-running risk**
🎯 **No sandwich attacks**
🎯 **No MEV extraction**
🎯 **Bob gets his target price**

---

## 🎯 CLOSING (1:25 - 1:30)

**Visual:** Shadow Orders logo + URL

**Narration:**
> "Shadow Orders—private, MEV-resistant limit orders on Uniswap V4."
> 
> "Let's see it in action!"

**[TRANSITION TO LIVE DEMO]**

---

## 📝 Whiteboard Drawing Sequence

### Scene 1 (Problem):
1. Draw stick figure "Bob"
2. Draw thought bubble: "50 ETH @ $2,000"
3. Draw arrow to "Mempool" cloud
4. Draw evil bot character watching mempool
5. Show bot buying: "20 ETH @ $2,000"
6. Show price arrow going UP: "$2,000 → $2,100"
7. Show Bob's transaction executing: "50 ETH @ $2,100 = $105,000"
8. Show Bob sad face with "-$5,000"
9. Show bot happy face with "+$2,000"

### Scene 2 (Solution):
1. Draw Bob again
2. Draw encryption shield around his order
3. Draw "???" for encrypted data
4. Draw crossed-out bot (can't see!)
5. Draw blockchain with lock symbol
6. Show checkmark for successful order
7. Show Bob happy: "$100,000 ✓"

### Scene 3 (Architecture):
1. Draw browser icon
2. Draw "Inco Lightning TEE" box
3. Draw encrypted data blob (lines/symbols)
4. Draw "Uniswap V4 Hook" on blockchain
5. Draw "Keeper" character monitoring
6. Draw execution arrow when price matches
7. Draw success checkmark

---

## 🎨 Visual Style Tips

- **Use contrasting colors:**
  - Bob: Blue
  - MEV Bot: Red
  - Encryption/Security: Green
  - Money/Prices: Yellow/Gold

- **Animate key numbers** (zoom in for emphasis):
  - $5,000 loss
  - $2,000 bot profit
  - Encrypted data symbols

- **Use emojis/icons:**
  - 😊 Happy Bob at end
  - 😢 Sad Bob with loss
  - 😈 Evil bot
  - 🔒 Lock for encryption
  - ✅ Checkmarks for success
  - ❌ X for failures
  - 💰 Money bags

---

## ⏱️ Timing Breakdown

| Section | Time | Content |
|---------|------|---------|
| Problem Setup | 0:00-0:15 | Introduce Bob, transaction, mempool |
| MEV Attack | 0:15-0:30 | Show bot front-running, losses |
| Solution Intro | 0:30-0:45 | Shadow Orders + encryption |
| How It Works | 0:45-1:15 | Architecture & workflow |
| Tech Stack | 1:15-1:25 | Show logos, technologies |
| Closing | 1:25-1:30 | Call to action, demo transition |

---

## 💡 Key Talking Points to Emphasize

1. **The Problem is REAL** - $5,000 loss is significant
2. **MEV bots profit while users lose** - unfair system
3. **Encryption solves it** - can't front-run what you can't see
4. **TEE is fast & secure** - not just private, but practical
5. **Built on proven tech** - Uniswap V4, Inco, Base
6. **Works today** - live on testnet, ready to demo

---

## 🚀 Demo Transition Script

> "Now let me show you Shadow Orders in action. We'll create an encrypted limit order, watch the price simulation, and see MEV-free execution live on Base Sepolia."

---

## 📋 Preparation Checklist

Before recording:
- [ ] Practice the script 3-5 times
- [ ] Time yourself (should be 1:20-1:30)
- [ ] Prepare whiteboard layout (light pencil sketch)
- [ ] Test markers (different colors work)
- [ ] Have numbers written clearly
- [ ] Prepare demo environment (app running)
- [ ] Check wallet has testnet ETH
- [ ] Have example order parameters ready

---

Good luck with your video! This structure should give you a compelling 1:30 intro before the live demo.
