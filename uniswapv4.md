The Uniswap v4 SDK
Welcome to the v4 Uniswap SDK!

The Uniswap v4 SDK provides abstractions to assist you with interacting with the Uniswap v4 smart contracts in a Typescript/Javascript environment (e.g. websites, node scripts). It makes use of the Core SDK to gain access to abstractions that are common amongst the Uniswap SDKs. With the SDK, you can add/remove liquidity, collect fees like what you will usually do with v3 SDK, but more with the extra functionalities from hooks introduced in v4!

For complete documentation of the SDK's offerings, see the Technical Reference.

Installation
To interact with the v4 SDK we recommend installing through npm:

npm i --save @uniswap/v4-sdk
npm i --save @uniswap/sdk-core

What's Different in v4
The Uniswap v4 SDK introduces some major changes that fundamentally alter how developers interact with Uniswap. Understanding these key differences is essential for successful v4 development.

Key Changes
Universal Router Requirement for Swapping
What changed: v3 allowed direct calls to the v3 Swap Router contract. v4 requires all swapping operations to go through the Universal Router.

Why: v4's singleton PoolManager architecture and flash accounting system require a different interaction pattern. The v4Planner batches operations and encodes them for the Universal Router - you cannot make direct swap calls.

Key differences:

All swaps must be "planned" using v4Planner, even single swaps
Operations use new patterns: SETTLE (pay tokens) and TAKE (receive tokens)
Enables efficient multi-step operations and cross-protocol routes
Impact: This enables more efficient multi-step operations in a single transaction.

StateView Contract Introduction
Why it exists: v4 uses a singleton PoolManager that tracks all pools in one contract, unlike v3's separate pool contracts.

What it means: The StateView contract wraps the PoolManager's state reading functions with a dedicated view-only interface. Instead of calling the PoolManager directly for state queries, you use StateView for cleaner, more organized access to pool data like slot0, tick info, liquidity, and position information.

Impact: Provides a dedicated, organized interface for off-chain clients to read pool state data.

Position Fetching Changed
What changed: v3 allowed easy enumeration of user positions on-chain. v4 provides no way to get all of a user's position IDs directly from the contracts. Additionally, position information is packed into a single uint256 value for efficiency, requiring decoding to extract individual fields like liquidity, fee growth, and tick ranges.

Why it's different: This design choice means position enumeration must happen off-chain through event indexing.

Impact: Applications must choose and implement indexing solutions to know which positions a user owns.

Fee Collection Behavior Changed
What changed: v3 had an explicit collect() function for fee collection. v4 has no standalone collect function - fees are automatically collected and distributed when you modify positions.

New pattern:

Fees automatically roll over when increasing/decreasing liquidity
To collect fees without modifying position size, you must modify the position with zero change (e.g., modifyLiquidity(positionId, 0))
StateView contract must be used to query the fee growth inside in order to calculate the exact amount of fees owed
Impact: Fee collection logic must be redesigned around position modifications rather than explicit collect() calls.

Quick Comparison
Feature	v3	v4
Swapping	Direct router calls	Universal Router
Pool State	Individual pool contracts	StateView contract
Position Discovery	On-chain enumeration	Off-chain indexing
Fee Collection	Explicit collect()	Automatic on modification
What This Means for Developers
Migration Requirements
Restructure all swaps to use Universal Router with v4Planner
Build position indexing systems using event logs and subgraphs for position discovery
Redesign fee collection logic to use position modifications instead of explicit collect() calls
Implement StateView integration for all pool state queries instead of direct PoolManager calls
Development Impact
Universal Router: All swaps must be batched, but enables complex multi-step operations
Position tracking: Requires additional infrastructure
Fee collection: Simpler in some cases (automatic), more complex in others (zero-change modifications)
StateView: Cleaner interface for state queries
Learning Path
To get started with v4 SDK development, follow these guides based on the key changes:

1. Swapping
Learn how to restructure swaps using Universal Router integration.

Guides:

Getting a Quote
Executing a Single-Hop Swap
Executing Multi-Hop Swaps
2. Position Management (Off-chain Indexing + Fee Collection)
Understand position tracking systems and the new automatic fee collection patterns.

Guides:

Minting a Position
Fetching Positions
Collecting Fees
Adding and Removing Liquidity
3. Advanced Features (StateView + Pool Creation)
Explore efficient state queries and pool creation with the new architecture.

Guides:

Fetching Pool Data
Create Pool
Developer Links
v4 SDK GitHub Repo
Core SDK GitHub Repo
v4 SDK NPM Package

Getting a Quote
Introduction
This guide will cover how to get the current quotes for any token pair on the Uniswap protocol.

In this example we will use quoteExactInputSingle to get a quote for the pair ETH - USDC. The inputs are poolKey, zeroForOne, exactAmount and hookData.

The guide will cover:

Constructing the PoolKey and swap parameters
Referencing the Quoter contract and getting a quote
At the end of the guide, we should be able to fetch the output for the given token pair and input amount.

For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
Constructing the PoolKey and Swap parameters
We will first create an example configuration CurrentConfig in config.ts. For this example, we are using the 0.05% ETH - USDC pool which has the format:

import { SwapExactInSingle } from '@uniswap/v4-sdk'
import { USDC_TOKEN, ETH_TOKEN } from './constants'
import { parseUnits, JsonRpcProvider, formatUnits } from 'ethers'

export const CurrentConfig: SwapExactInSingle = {
    poolKey: {
        currency0: ETH_TOKEN.address,
        currency1: USDC_TOKEN.address,
        fee: 500,
        tickSpacing: 10,
        hooks: "0x0000000000000000000000000000000000000000",
    },
    zeroForOne: true,
    amountIn: parseUnits('1', ETH_TOKEN.decimals).toString(), 
    amountOutMinimum: "0",
    hookData: '0x00'
}

The pool used is defined by a pair of tokens in constants.ts. You can also change these two tokens and the other pool parameters in the config, just make sure a pool actually exists for your configuration. Check out the top pools on Uniswap.

import { Token, ChainId } from '@uniswap/sdk-core'

export const ETH_TOKEN = new Token(
  ChainId.MAINNET,
  '0x0000000000000000000000000000000000000000',
  18,
  'ETH',
  'Ether'
)

export const USDC_TOKEN = new Token(
  ChainId.MAINNET,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  6,
  'USDC',
  'USDC'
)

Referencing the Quoter contract and getting a quote
To get quotes for trades, Uniswap has deployed a Quoter Contract. We will use this contract to fetch the output amount we can expect for our trade, without actually executing the trade.

Now, we need to construct an instance of an ethers Contract for our Quoter contract in order to interact with it:

const quoterContract = new ethers.Contract(
  QUOTER_CONTRACT_ADDRESS,
  QUOTER_ABI, // Import or define the ABI for Quoter contract
  new JsonRpcProvider("RPC") // Provide the right RPC address for the chain
)

We get the QUOTE_CONTRACT_ADDRESS for our chain from Uniswap Deployments.

We can now use our Quoter contract to obtain the quote.

In an ideal world, the quoter functions would be view functions, which would make them very easy to query on-chain with minimal gas costs. However, the Uniswap V4 Quoter contracts rely on state-changing calls designed to be reverted to return the desired data. This means calling the quoter will be very expensive and should not be called on-chain.

To get around this difficulty, we can use the callStatic method provided by the ethers.js Contract instances. This is a useful method that submits a state-changing transaction to an Ethereum node, but asks the node to simulate the state change, rather than to execute it. Our script can then return the result of the simulated state change:

const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle({
    poolKey: CurrentConfig.poolKey,
    zeroForOne: CurrentConfig.zeroForOne,
    exactAmount: CurrentConfig.amountIn, 
    hookData: CurrentConfig.hookData,
})

console.log(formatUnits(quotedAmountOut.amountOut, USDC_TOKEN.decimals));

The result of the call is the number of output tokens you would receive for the quoted swap.

It should be noted that quoteExactInputSingle is only 1 of 4 different methods that the quoter offers:

quoteExactInputSingle - given an input amount, produce a quote of the output amount for a swap on a single pool
quoteExactInput - given an input amount, produce a quote for the output amount a swap over multiple pools
quoteExactOutputSingle - given a desired output amount, produce a quote for the input amount on a swap over a single pool
quoteExactOutput - given a desired output amount, produce a quote for the input amount in for a swap over multiple pools
If we want to trade two tokens that do not share a pool with each other, we will need to make swaps over multiple pools. This is where the quoteExactInput and quoteExactOutput methods come in.

For the exactOutput and exactOutputSingle methods, we need to keep in mind that a pool can not give us more than the amount of Tokens it holds. If we try to get a quote on an output of 100 ETH from a pool that only holds 50 ETH, the function call will fail.

Executing a Single-Hop Swap
Introduction
This guide will build off our quoting guide and show how to use a quote to construct and execute a trade on the Uniswap v4 protocol. In this example we will trade between two tokens: ETH and USDC.

The guide will cover:

Setting up swap parameters and pool configuration
Using Universal Router and executing a single-hop swap
At the end of this guide, you should be able to execute swaps between any two tokens using a single pool on Uniswap V4.

For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
@uniswap/universal-router-sdk
Setting up Swap Configuration
First, let's define our swap configuration. We will use the same pool structure from the quoting guide:

import { SwapExactInSingle } from '@uniswap/v4-sdk'
import { USDC_TOKEN, ETH_TOKEN } from './constants'

export const CurrentConfig: SwapExactInSingle = {
    poolKey: {
        currency0: ETH_TOKEN.address,
        currency1: USDC_TOKEN.address,
        fee: 500,
        tickSpacing: 10,
        hooks: "0x0000000000000000000000000000000000000000",
    },
    zeroForOne: true, // The direction of swap is ETH to USDC. Change it to 'false' for the reverse direction
    amountIn: ethers.utils.parseUnits('1', ETH_TOKEN.decimals).toString(), 
    amountOutMinimum: "minAmountOut", // Change according to the slippage desired
    hookData: '0x00'
}


Like the quoting guide, the pool used is defined by a pair of tokens in constants.ts. You can change these two tokens and the other pool parameters in the config as long as a pool actually exists for that configuration.

Using Universal Router and executing a single-hop swap
The Universal Router is a flexible, gas-efficient contract designed to execute complex swap operations across various protocols, including Uniswap v4. It serves as an intermediary between users and the Uniswap v4 PoolManager, handling the intricacies of swap execution.

So, we construct an instance of an ethers Contract for the Universal Router contract in order to interact with it:

const UNIVERSAL_ROUTER_ADDRESS = "0x66a9893cc07d91d95644aedd05d03f95e1dba8af" // Change the Universal Router address as per the chain

const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "bytes", name: "commands", type: "bytes" },
      { internalType: "bytes[]", name: "inputs", type: "bytes[]" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
]

const universalRouter = new ethers.Contract(
    UNIVERSAL_ROUTER_ADDRESS,
    UNIVERSAL_ROUTER_ABI,
    signer
)


We can get the UNIVERSAL_ROUTER_ADDRESS for our chain from Uniswap Deployments.

A signer object can be created like this:

const provider = new ethers.providers.JsonRpcProvider("RPC");
const signer = new ethers.Wallet(
  "YOUR PRIVATE KEY",
  provider
);

Now, let's implement the main function that handles the swap. When encoding a swap command for the Universal Router, we need to choose between two types of swaps:

Exact Input Swaps: Use this swap-type when you know the exact amount of tokens you want to swap in, and you're willing to accept any amount of output tokens above your minimum. This is common when you want to sell a specific amount of tokens.
Exact Output Swaps: Use this swap-type when you need a specific amount of output tokens, and you're willing to spend up to a maximum amount of input tokens. This is useful when you need to acquire a precise amount of tokens, for example, to repay a loan or meet a specific requirement.
We will be doing an Exact Input swap in this example.

import { Actions, V4Planner } from '@uniswap/v4-sdk'
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk'

const v4Planner = new V4Planner()
const routePlanner = new RoutePlanner()

// Set deadline (1 hour from now)
const deadline = Math.floor(Date.now() / 1000) + 3600

v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [CurrentConfig]);
v4Planner.addAction(Actions.SETTLE_ALL, [CurrentConfig.poolKey.currency0, CurrentConfig.amountIn]);
v4Planner.addAction(Actions.TAKE_ALL, [CurrentConfig.poolKey.currency1, CurrentConfig.amountOutMinimum]);

const encodedActions = v4Planner.finalize()

routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params])

// Only needed for native ETH as input currency swaps
const txOptions: any = {
    value: CurrentConfig.amountIn
}

const tx = await universalRouter.execute(
    routePlanner.commands,
    [encodedActions],
    deadline,
    txOptions
)

const receipt = await tx.wait()
console.log('Swap completed! Transaction hash:', receipt.transactionHash)

The actions in the planner define the sequence of operations that will be performed in our v4 swap:

SWAP_EXACT_IN_SINGLE: This action specifies that we want to perform an exact input swap using a single pool.
SETTLE_ALL: This action ensures all input tokens involved in the swap are properly paid. This is part of v4's settlement pattern for handling token transfers.
TAKE_ALL: This final action collects all output tokens after the swap is complete.
The sequence of these actions is important as they define the complete flow of our swap operation from start to finish. The input and output currencies should be exchanged for the SETTLE_ALL and TAKE_ALL actions if the direction of the swap is reversed.

The V4_SWAP command tells the Universal Router that we want to perform a swap on a Uniswap v4 pool.

Handling Token Approvals for ERC20 Swaps
When swapping ERC20 tokens, we need to set up approvals through Permit2. So, we construct an instance of an ethers Contract for the Permit2 contract in order to interact with it:

const permit2Contract = new ethers.Contract(
    PERMIT2_ADDRESS, 
    PERMIT2_ABI, 
    signer
)

Create a similar one for the ERC20 token contract. If enough allowances have not been provided or the deadline has expired, we first need to approve Permit2 as a spender on the ERC20 token and then approve the Universal Router on Permit2.

const tx1 = await erc20Contract.approve(PERMIT2_ADDRESS, ethers.constants.MaxUint256)
const tx2 = await permit2Contract.approve(
  tokenAddress,
  UNIVERSAL_ROUTER_ADDRESS,
  ethers.BigNumber.from(2).pow(160).sub(1), // MAX_UINT160
  deadline
)

The rest of the swap process remains the same.

Next Steps
Now that you understand single-hop swaps, you might want to explore multi-hop swaps for trading between tokens without direct pools or enough liquidity.

Previous
Executing Multi-Hop Swaps
Introduction
This guide demonstrates how to execute multi-hop swaps on Uniswap V4, allowing you to trade between tokens that might not share a direct pool. Multi-hop swaps route through multiple pools to achieve the desired token exchange, often providing better pricing than attempting direct swaps through less liquid pools.

Building on our single-hop swap guide, this guide will show you how to construct routing paths and execute them efficiently.

The guide will cover:

Constructing swap paths through multiple pools
Executing the multi-hop swap
At the end of this guide, you should be able to execute swaps between any two tokens using optimal routing through multiple pools.

For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
@uniswap/universal-router-sdk
Constructing swap paths through multiple pools
Let's first define a multi-hop swap configuration. In this example, we'll swap ETH → USDC → USDT. The configuration follows closely from the quoting and single-hop swapping guides.

import { SwapExactIn, PoolKey } from '@uniswap/v4-sdk'
import { ETH_TOKEN, USDC_TOKEN, USDT_TOKEN } from './constants'

const ETH_USDC_POOL_KEY: PoolKey = {
    currency0: ETH_TOKEN.address,
    currency1: USDC_TOKEN.address,
    fee: 3000,
    tickSpacing: 60,
    hooks: "0x0000000000000000000000000000000000000000",
};

const USDC_USDT_POOL_KEY: PoolKey = {
    currency0: USDC_TOKEN.address,
    currency1: USDT_TOKEN.address,
    fee: 10,
    tickSpacing: 1,
    hooks: "0x0000000000000000000000000000000000000000",
};

export const CurrentConfig: SwapExactIn = {
    currencyIn: ETH_TOKEN.address,
    path: encodeMultihopExactInPath(
        [ETH_USDC_POOL_KEY, USDC_USDT_POOL_KEY],
        ETH_TOKEN.address
    ),
    amountIn: ethers.utils.parseUnits('1', ETH_TOKEN.decimals).toString(), 
    amountOutMinimum: "minAmountOut", // Change according to the slippage desired
}

Uniswap V4 uses a specific format for encoding multi-hop paths. Each hop in the path requires:

type PathKey = {
    intermediateCurrency: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
    hookData: string;
};

We can encode the path using a function like:

export function encodeMultihopExactInPath(
  poolKeys: PoolKey[],
  currencyIn: string
): PathKey[] {
  const pathKeys: PathKey[] = []
  let currentCurrencyIn = currencyIn
  
  for (let i = 0; i < poolKeys.length; i++) {
    // Determine the output currency for this hop
    const currencyOut = currentCurrencyIn === poolKeys[i].currency0
      ? poolKeys[i].currency1
      : poolKeys[i].currency0
    
    // Create path key for this hop
    const pathKey: PathKey = {
      intermediateCurrency: currencyOut,
      fee: poolKeys[i].fee,
      tickSpacing: poolKeys[i].tickSpacing,
      hooks: poolKeys[i].hooks,
      hookData: '0x'
    }
    
    pathKeys.push(pathKey)
    currentCurrencyIn = currencyOut // Output becomes input for next hop
  }
  
  return pathKeys
}

Executing the multi-hop swap
We'll use the same contract addresses and ABIs from the single-hop guide and construct the ethers Contract for them:

const UNIVERSAL_ROUTER_ADDRESS = "0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af"
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

// ABIs remain the same as in single-hop guide
const UNIVERSAL_ROUTER_ABI = [/* ... */]
const ERC20_ABI = [/* ... */]
const PERMIT2_ABI = [/* ... */]

The main function for executing multi-hop swaps is very similar to the single-hop guide as well. The only difference is that the first action to the Universal Router is SWAP_EXACT_IN instead of SWAP_EXACT_IN_SINGLE.

import { Actions, V4Planner } from '@uniswap/v4-sdk'
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk'

const v4Planner = new V4Planner()
const routePlanner = new RoutePlanner()

const deadline = Math.floor(Date.now() / 1000) + 3600

v4Planner.addAction(Actions.SWAP_EXACT_IN, [CurrentConfig]);
v4Planner.addAction(Actions.SETTLE_ALL, [ETH_USDC_POOL_KEY.currency0, CurrentConfig.amountIn]);
v4Planner.addAction(Actions.TAKE_ALL, [USDC_USDT_POOL_KEY.currency1, CurrentConfig.amountOutMinimum]);

const encodedActions = v4Planner.finalize()

routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params])

// Only needed for native ETH as input currency swaps
const txOptions: any = {
    value: CurrentConfig.amountIn
}

const tx = await universalRouter.execute(
  routePlanner.commands,
  [encodedActions],
  deadline,
  txOptions
)

const receipt = await tx.wait()
console.log('Multi-hop swap completed! Transaction hash:', receipt.transactionHash)

The token approvals for ERC20 token swaps remain the same as the single-hop swapping guide.

Next Steps
Now that you're familiar with trading, consider checking out our next guides on pooling liquidity to Uniswap!
Minting a position
Introduction
This guide will introduce us to liquidity positions in Uniswap v4 and present the v4-sdk classes and contracts used to interact with the protocol.

For this guide, the following Uniswap packages are used:

@uniswap/v3-sdk
@uniswap/v4-sdk
@uniswap/sdk-core
Overview of Uniswap v4 Position Minting
Uniswap v4 introduces a new PositionManager contract and a corresponding v4 SDK to manage liquidity positions. Like v3, liquidity positions are represented as NFTs, but v4 uses a command-based interface for bundling actions (e.g., minting liquidity and transferring tokens) into a single transaction.

The v4 SDK provides high-level classes – Pool, Position, and v4PositionManager – to help construct these transactions in JavaScript/TypeScript. This guide explains how to create (mint) a new liquidity position using the Uniswap v4 SDK.

We will cover:

Setting up a Pool and Position for minting
Configuring MintOptions (all parameters, types, and defaults)
Using v4PositionManager.addCallParameters to get transaction data
Preparing Pool and Position Objects
Before minting, you need a Pool instance reflecting the current on-chain state and a Position defining your desired liquidity parameters:

Step 1: Define Token Information
import { Token, ChainId, Ether } from '@uniswap/sdk-core'

const ETH_NATIVE = Ether.onChain(ChainId.Mainnet)

const ETH_TOKEN = new Token(
  ChainId.MAINNET,
  '0x0000000000000000000000000000000000000000',
  18,
  'ETH',
  'Ether'
)

const USDC_TOKEN = new Token(
  ChainId.MAINNET,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  6,
  'USDC',
  'USDC'
)

Note: In v4, pools are identified by a PoolKey (which includes token0, token1, fee, tick spacing, and hook address). The SDK's Pool class helps manage these details. Ensure that the token order (token0 vs token1) and the hook address match the actual pool.

Step 2: Fetch Pool State
Before creating a Pool instance, you need to fetch the current state from the blockchain:

import { createPublicClient, http } from 'viem';
import { Pool } from '@uniswap/v4-sdk';

// Define constants for the function
// The STATE_VIEW_ADDRESS should be imported from your constants file
// or defined at the top of your file
const STATE_VIEW_ADDRESS = '0x86e8631a016f9068c3f085faf484ee3f5fdee8f2'; // Replace with actual StateView contract address
const STATE_VIEW_ABI = [...]; // Import or define the ABI for StateView contract
const CHAIN_ID = xxx; // Replace Chain id

// Create a viem client for reading blockchain data
const client = createPublicClient({
  chain: CHAIN_ID,
  transport: http()
});

// Define pool parameters
const fee = 500; // Fee tier (e.g., 500 = 0.05%)
const tickSpacing = 10; // Tick spacing for this fee tier
const hookAddress = '0x0000...'; // Hook address, if any (or zero address)

// Get the pool ID using SDK helper
const poolId = Pool.getPoolId(token0, token1, fee, tickSpacing, hookAddress);

// Fetch current pool state from the blockchain
const [slot0, liquidity] = await Promise.all([
  client.readContract({
    address: STATE_VIEW_ADDRESS,
    abi: STATE_VIEW_ABI,
    functionName: 'getSlot0',
    args: [poolId as `0x${string}`],
  }),
  client.readContract({
    address: STATE_VIEW_ADDRESS,
    abi: STATE_VIEW_ABI,
    functionName: 'getLiquidity',
    args: [poolId as `0x${string}`],
  }),
]);

// Extract relevant data
const sqrtPriceX96Current = slot0[0] as bigint;
const currentTick = slot0[1] as number;
const currentLiquidity = liquidity as bigint;

// Create Pool instance with the fetched data
const pool = new Pool(
  token0,
  token1,
  fee,
  tickSpacing,
  hookAddress, // Pass the hook address from above
  sqrtPriceX96Current.toString(), // Convert bigint to string for SDK
  currentLiquidity.toString(), // Convert bigint to string for SDK
  currentTick, // Current tick from slot0
);


Step 3: Define Position Parameters
Now define the parameters for your liquidity position:

import { nearestUsableTick } from "@uniswap/v3-sdk";

// Define position parameters
// These typically come from user input in your interface
const fullRange = false // Whether to create a full-range position
const tickRange = 500 // Tick range around current price (e.g., 5%)
const amountA = 1.0 // Amount of token A to deposit
const amountB = 1000.0 // Amount of token B to deposit

// Calculate tick boundaries based on user preferences
let tickLower: number
let tickUpper: number

if (fullRange) {
  // For full-range positions, use Uniswap's minimum and maximum allowed ticks
  const MIN_TICK = -887272
  const MAX_TICK = 887272

  // Get tick spacing from the pool (already fetched from blockchain)
  const poolTickSpacing = pool.tickSpacing

  // Round tickLower up (closer to the center)
  // The nearestUsableTick ensures the tick is aligned with tick spacing
  tickLower = nearestUsableTick(MIN_TICK, poolTickSpacing)

  // Round tickUpper down (closer to the center)
  tickUpper = nearestUsableTick(MAX_TICK, poolTickSpacing)
} else {
  // Calculate lower and upper ticks, ensuring they align with tick spacing
  tickLower = nearestUsableTick(currentTick - tickRangeAmount, tickSpacing)
  tickUpper = nearestUsableTick(currentTick + tickRangeAmount, tickSpacing)
}

// Convert human-readable amounts to token amounts with proper decimals
const amountADesired = BigInt(Math.floor(amountA * 10 ** ETH_TOKEN.decimals))
const amountBDesired = BigInt(Math.floor(amountB * 10 ** USDC_TOKEN.decimals))

// Ensure token amounts are in the correct order (token0, token1)
const amount0Desired = token0IsA ? amountADesired.toString() : amountBDesired.toString()
const amount1Desired = token0IsA ? amountBDesired.toString() : amountADesired.toString()

Step 5: Create a Position
Use the SDK to create a Position object that represents your liquidity position:

import { Position } from '@uniswap/v4-sdk'

// Create a position from the desired token amounts
// The SDK will calculate the maximum liquidity possible with these amounts
const position = Position.fromAmounts({
  pool,
  tickLower,
  tickUpper,
  amount0: amount0Desired,
  amount1: amount1Desired,
  useFullPrecision: true, // Use full precision for maximum accuracy
})

// You can now access useful information from the position:
// position.mintAmounts - The actual amounts needed to mint this position
// position.amount0 - The amount of token0 in the position
// position.amount1 - The amount of token1 in the position
// position.liquidity - The liquidity value of the position
console.log('Position liquidity:', position.liquidity.toString())
console.log('Token0 amount:', position.amount0.toExact())
console.log('Token1 amount:', position.amount1.toExact())

Alternative: If you have a specific liquidity amount instead of token amounts, you could use:

const position = new Position({
  pool,
  tickLower,
  tickUpper,
  liquidity: '1000000000000000000', // Example liquidity amount
})

Understanding MintOptions and Its Parameters
Once the Position is defined, the next step is to prepare the MintOptions object. In Uniswap v4 SDK, MintOptions is a type alias that combines three sets of options: CommonOptions, CommonAddLiquidityOptions, and MintSpecificOptions. This structure covers generic transaction settings, options common to any "add liquidity" action, and options unique to minting a new position.

MintOptions Parameters Explained
// Import necessary types
import { Percent } from '@uniswap/sdk-core'
import { MintOptions } from '@uniswap/v4-sdk'

// Example code showing how to set up MintOptions
// These parameters typically come from user input or application state

// 1. slippageTolerance (required): Maximum allowed price movement
// Convert from a percentage (e.g., 0.5%) to a Percent object
// Here, 50 out of 10000 = 0.5%
const slippageTolerance = 0.5 // 0.5% slippage tolerance
const slippagePct = new Percent(Math.floor(slippageTolerance * 100), 10_000)

// 2. deadline (required): Transaction expiry timestamp in seconds
// Usually current time + some buffer (e.g., 20 minutes)
const deadlineSeconds = 20 * 60 // 20 minutes
const currentBlock = await publicClient.getBlock()
const currentBlockTimestamp = Number(currentBlock.timestamp)
const deadline = currentBlockTimestamp + deadlineSeconds

// 3. recipient (required): Address to receive the position NFT
// Typically the user's wallet address
const userAddress = '0xYourAddressHere' // Replace with actual user address

// Create the basic MintOptions object with required fields
const mintOptions: MintOptions = {
  recipient: userAddress,
  slippageTolerance: slippagePct,
  deadline: deadline.toString(),

  // 4. useNative (optional): Use native ETH
  useNative: ETH_TOKEN.isNative
    ? Ether.onChain(ETH_TOKEN.chainId)
    : USDC_TOKEN.isNative
    ? Ether.onChain(USDC_TOKEN.chainId)
    : undefined,

  // 5. batchPermit (optional): For gasless approvals via Permit2
  // We'll set this later if needed

  // 6. hookData (optional): Data for pool hooks
  // Only needed for pools with custom hooks
  hookData: '0x', // Default empty bytes

  // 7-8. For new pools only:
  // createPool: true, // Uncomment if creating a new pool
  // sqrtPriceX96: '1234567890123456789', // Initial price, required if createPool is true

  // 9. For migrations only:
  // migrate: false, // Normally omitted unless migrating from v3
}

Parameter	Type	Description	Required
slippageTolerance	Percent	Max price movement allowed (for min amount calc)	Yes
deadline	BigintIsh	Tx expiry timestamp (seconds)	Yes
recipient	string	Address to receive the position NFT	Yes
hookData	string (bytes)	Data for pool hook (if applicable)	No
useNative	NativeCurrency	Use native ETH instead of wrapped token if one is WETH	No
batchPermit	BatchPermitOptions	Permit2 parameters for gasless token approval	No
createPool	boolean	Create & initialize pool if not existent	No (default false)
sqrtPriceX96	BigintIsh	Initial price (sqrtP) for new pool (required if createPool)	No
migrate	boolean	Mark as part of v3→v4 migration flow	No
Using Permit2 for Gasless Approvals (Optional)
The batchPermit option allows users to sign a message off-chain to grant token approval, avoiding separate approve transactions. Here's how to implement it:

// Constants and imports needed for Permit2
import { getWalletAccount } from './your-wallet-helpers';

// Define necessary constants
const CONTRACTS = {
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3', // Permit2 contract address
  POSITION_MANAGER: '0x4529a01c7a0410167c5740c487a8de60232617bf.', // Position Manager address (unichain)
};

const PERMIT2_ABI = [...]; // Import or define Permit2 ABI
const PERMIT2_TYPES = {
  PermitBatch: [
    { name: 'details', type: 'PermitDetails[]' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' }
  ],
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' }
  ]
};

// Check if we should use Permit2 (application setting or user preference)
const usePermit2 = true; // This could be a user setting

if (usePermit2) {
  // Generate Permit2 data only for ERC20 tokens (not needed for native ETH)
  const permitDetails = [];

  // Process tokenA if it's not native
  if (!ETH_TOKEN.isNative) {
    // Get current nonce from Permit2 contract
    const [, , nonce] = (await publicClient.readContract({
      account: getWalletAccount(), // Your function to get the current wallet
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: 'allowance',
      args: [userAddress, ETH_TOKEN.address, POSITION_MANAGER_ADDRESS],
    })) as [bigint, bigint, bigint];

    // Add permit details for this token
    // Max uint160 value is used as the amount for an unlimited allowance
    permitDetails.push({
      token: ETH_TOKEN.address,
      amount: (2n ** 160n - 1n).toString(), // Max uint160
      expiration: deadline.toString(),
      nonce: nonce.toString(),
    });
  }

  // Do the same for tokenB if it's not native
  if (!USDC_TOKEN.isNative) {
    const [, , nonce] = (await publicClient.readContract({
      account: getWalletAccount(),
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: 'allowance',
      args: [userAddress, USDC_TOKEN.address, POSITION_MANAGER_ADDRESS],
    })) as [bigint, bigint, bigint];

    permitDetails.push({
      token: USDC_TOKEN.address,
      amount: (2n ** 160n - 1n).toString(),
      expiration: deadline.toString(),
      nonce: nonce.toString(),
    });
  }

  // If we have any tokens to permit, create and sign the permit message
  if (permitDetails.length > 0) {
    // Create permit data
    const permitData = {
      details: permitDetails,
      spender: POSITION_MANAGER_ADDRESS,
      sigDeadline: deadline.toString(),
    };

    // Sign the permit data with the user's wallet
    // This requires user interaction to approve the signature
    const signature = await walletClient.signTypedData({
      account,
      domain: {
        name: 'Permit2',
        chainId,
        verifyingContract: PERMIT2_ADDRESS,
      },
      types: PERMIT2_TYPES,
      primaryType: 'PermitBatch',
      message: permitData,
    });

    // Add the permit data and signature to our mint options
    mintOptions.batchPermit = {
      owner: userAddress,
      permitBatch: permitData,
      signature,
    };
  }
}

Using v4PositionManager to Generate Mint Transaction
With a Position object and MintOptions prepared, we can now use the SDK to compute the calldata and value needed for the transaction:

import { V4PositionManager } from '@uniswap/v4-sdk'

// Generate transaction parameters
// This produces the calldata and value needed for the blockchain transaction
const { calldata, value } = V4PositionManager.addCallParameters(position, mintOptions)

// Log the results (for debugging)
console.log('Calldata:', calldata)
console.log('Value:', value)

Under the hood, addCallParameters builds the necessary function calls to the PositionManager contract:

It encodes a MINT_POSITION command with your position parameters (pool key, tickLower, tickUpper, liquidity) and a SETTLE_PAIR command to pull in the tokens.
The slippageTolerance is applied to calculate amount0Max and amount1Max – these are the maximum token amounts the contract is allowed to take.
If useNative was true, it would also append a SWEEP command for the native token. In case of solidity, please read this report carefully.
If batchPermit is provided, the SDK will prepend the permit call using the contract's multicall capability.
Executing the Transaction with Viem
After obtaining calldata and value, you need to send the transaction to the blockchain:

import { createWalletClient } from 'viem'

// Function to execute the mint transaction
async function executeTransaction() {
  try {
    // Send the transaction
    const txHash = await walletClient.writeContract({
      account,
      chain: chainId,
      address: POSITION_MANAGER_ADDRESS,
      abi: POSITION_MANAGER_ABI,
      functionName: 'multicall',
      args: [[calldata]],
      value: BigInt(value),
    })

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    })
  } catch (error) {
    console.error('Transaction failed:', error)
  }
}

Fetching Positions
Introduction
This guide covers how to fetch and analyze liquidity positions in Uniswap v4 using the v4-sdk.

For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
Key Differences from v3
The v4 PositionManager does not implement ERC721Enumerable, so tokenOfOwnerByIndex is not available. This requires using the subgraph to discover position IDs. Additionally, v4 uses a packed data format for position information.

Setup
import { createPublicClient, http, Address, zeroAddress } from 'viem'
import { unichain } from 'viem/chains'
import request from 'graphql-request'

const POSITION_MANAGER_ADDRESS = '0x4529a01c7a0410167c5740c487a8de60232617bf' //unichain

const publicClient = createPublicClient({
  chain: unichain,
  transport: http(),
})

Fetching Position IDs
interface SubgraphPosition {
  id: string
  tokenId: string
  owner: string
}

const GET_POSITIONS_QUERY = `
  query GetPositions($owner: String!) {
    positions(where: { owner: $owner }) {
      tokenId
      owner
      id
    }
  }
`

const UNICHAIN_SUBGRAPH_URL =
  'https://gateway.thegraph.com/api/subgraphs/id/EoCvJ5tyMLMJcTnLQwWpjAtPdn74PcrZgzfcT5bYxNBH'

async function getPositionIds(owner: Address): Promise<bigint[]> {
  // You can explore queries at: https://thegraph.com/explorer/subgraphs/EoCvJ5tyMLMJcTnLQwWpjAtPdn74PcrZgzfcT5bYxNBH?view=Query&chain=arbitrum-one

  const headers = {
    Authorization: 'Bearer ' + process.env.GRAPH_KEY, // Get your API key from https://thegraph.com/studio/apikeys/
  }

  const response = await request<{ positions: SubgraphPosition[] }>(
    UNICHAIN_SUBGRAPH_URL,
    GET_POSITIONS_QUERY,
    { owner: owner.toLowerCase() },
    headers
  )

  return response.positions.map((p) => BigInt(p.tokenId))
}


Decoding Packed Position Data
v4 stores position information in a packed format. Here's how to decode it:

interface PackedPositionInfo {
  getTickUpper(): number
  getTickLower(): number
  hasSubscriber(): boolean
}

function decodePositionInfo(value: bigint): PackedPositionInfo {
  return {
    getTickUpper: () => {
      const raw = Number((value >> 32n) & 0xffffffn)
      return raw >= 0x800000 ? raw - 0x1000000 : raw
    },

    getTickLower: () => {
      const raw = Number((value >> 8n) & 0xffffffn)
      return raw >= 0x800000 ? raw - 0x1000000 : raw
    },

    hasSubscriber: () => (value & 0xffn) !== 0n,
  }
}

Position Details Interface
interface PositionDetails {
  tokenId: bigint
  tickLower: number
  tickUpper: number
  liquidity: bigint
  poolKey: {
    currency0: Address
    currency1: Address
    fee: number
    tickSpacing: number
    hooks: Address
  }
}

Contract ABI
const POSITION_MANAGER_ABI = [
  {
    name: 'getPoolAndPositionInfo',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: 'poolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      { name: 'info', type: 'uint256' },
    ],
  },
  {
    name: 'getPositionLiquidity',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
  },
] as const

Fetching Position Details
async function getPositionDetails(tokenId: bigint): Promise<PositionDetails> {
  // Get pool key and packed position info
  // Get pool key and packed position info
  const [poolKey, infoValue] = (await publicClient.readContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'getPoolAndPositionInfo',
    args: [tokenId],
  })) as readonly [
    {
      currency0: Address
      currency1: Address
      fee: number
      tickSpacing: number
      hooks: Address
    },
    bigint
  ]

  // Get current liquidity
  const liquidity = (await publicClient.readContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'getPositionLiquidity',
    args: [tokenId],
  })) as bigint

  // Decode packed position info
  const positionInfo = decodePositionInfo(infoValue)

  return {
    tokenId,
    tickLower: positionInfo.getTickLower(),
    tickUpper: positionInfo.getTickUpper(),
    liquidity,
    poolKey,
  }
}

Usage Example
async function fetchUserPositions(userAddress: Address) {
  try {
    // Get position IDs from subgraph
    const tokenIds = await getPositionIds(userAddress)
    console.log(`Found ${tokenIds.length} positions on Unichain`)

    // Fetch details for each position
    for (const tokenId of tokenIds) {
      const details = await getPositionDetails(tokenId)

      console.log(`Position ${tokenId}:`)
      console.log(`  Token0: ${details.poolKey.currency0}`)
      console.log(`  Token1: ${details.poolKey.currency1}`)
      console.log(`  Fee: ${details.poolKey.fee / 10000}%`)
      console.log(`  Range: ${details.tickLower} to ${details.tickUpper}`)
      console.log(`  Liquidity: ${details.liquidity.toString()}`)
      console.log(`  Hooks: ${details.poolKey.hooks}`)
      console.log('---')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

// Example usage
fetchUserPositions('0xYourAddress' as Address)

Resources
Uniswap v4 SDK
Unichain Documentation

Collecting Fee
Introduction
This guide will cover:

Setting up our fee collection – Preparing to collect fees from a v4 position, including fetching position details, computing the poolId, using StateView to read fee growth data, and calculating the unclaimed fees off-chain.
Submitting our fee collection transaction – Using the v4 SDK to create the transaction calldata (with collectCallParameters), executing the call (via a multicall on the PositionManager).
For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
Fee Calculation Theory
In Uniswap v4, fees are not stored directly. Instead, fees must be calculated using differential calculation from cumulative values called feeGrowthInside.

feeGrowthInside Concept
feeGrowthInside = Cumulative fees generated in pool ÷ Active liquidity at that time

Unclaimed Fees (Currently Collectible Fees)
const Q128 = 2n ** 128n
unclaimedFees = ((feeGrowthCurrent - feeGrowthLast) * liquidity) / Q128

Compute unclaimed fees off-chain using the v4 formula:

feeGrowthInsideCurrentX128 (for token0 and token1): the total fee growth inside the range as of now.
feeGrowthInsideLastX128 (for token0 and token1): the fee growth inside the range at the last time the position's state was updated (recorded in the position info).
liquidity: the amount of liquidity in the position.
Implementation:

function calculateUnclaimedFeesV4(
  liquidity: bigint,
  feeGrowthInside0Current: bigint,
  feeGrowthInside1Current: bigint,
  feeGrowthInside0Last: bigint,
  feeGrowthInside1Last: bigint
): UnclaimedFees {
  const Q128 = 2n ** 128n

  // Overflow protection: return 0 if current is less than last
  const feeGrowthDelta0 =
    feeGrowthInside0Current >= feeGrowthInside0Last ? feeGrowthInside0Current - feeGrowthInside0Last : 0n

  const feeGrowthDelta1 =
    feeGrowthInside1Current >= feeGrowthInside1Last ? feeGrowthInside1Current - feeGrowthInside1Last : 0n

  return {
    token0Fees: (feeGrowthDelta0 * liquidity) / Q128,
    token1Fees: (feeGrowthDelta1 * liquidity) / Q128,
  }
}

Lifetime Fees (Total Fees Since Position Creation)
lifetimeFees = (feeGrowthCurrent * liquidity) / Q128

Implementation:

function calculateLifetimeFeesV4(
  liquidity: bigint,
  feeGrowthInside0Current: bigint,
  feeGrowthInside1Current: bigint
): LifetimeFees {
  const Q128 = 2n ** 128n

  return {
    token0LifetimeFees: (feeGrowthInside0Current * liquidity) / Q128,
    token1LifetimeFees: (feeGrowthInside1Current * liquidity) / Q128,
  }
}

3. Collected Fees Estimate
Calculation basis:

Total fees = Collected + Unclaimed
∴ Collected = Total fees - Unclaimed

v4 Architecture and Required Changes
Fee Accrual and Credit Changes
Fee Accrual and Credit: Uniswap v4 changes how fee accrual is handled when modifying liquidity. In v3, adding or removing liquidity didn't automatically claim fees – you had to call a separate collect function to pull out accrued fees. In v4, accrued fees act like a credit that is automatically applied or required depending on liquidity changes. Increasing a position's liquidity will roll any unclaimed fees into the position's liquidity, and decreasing liquidity will automatically withdraw the proportional unclaimed fees for that position. This means that partially removing liquidity in v4 will force-claim the fees earned by that liquidity portion. However, if you want to claim fees without changing liquidity, you can perform a liquidity change of zero (as we'll do in this guide).

Why StateView is Required
In v4, all pools are managed by a single PoolManager, so direct access to pool contracts is not possible. Instead, data must be read through the StateView contract.

// v4 approach (required)
await StateView.getPositionInfo(poolId, owner, tickLower, tickUpper, salt)

salt
In v4, the same owner can have multiple positions in the same tick range. salt is used to identify them individually.

Derive the salt for the position: As noted, v4 positions include a salt to distinguish positions with identical range by the same owner. For positions created via the PositionManager (which holds ownership in the pool), the salt is the NFT token ID, encoded as a 32-byte value.

// Use tokenId as salt (PositionManager standard)
const salt = `0x${tokenId.toString(16).padStart(64, '0')}`

Code Implementation Flow
Phase 1: Position Information Retrieval
Step 1: Position List Retrieval
Retrieves the tokenIds for v4 positions owned by a specific address from a Subgraph.

Step 2: Position Details Retrieval
async function getPositionDetails(tokenId: bigint): Promise<PositionDetails> {
  const [poolKey, infoValue] = await publicClient.readContract({
    address: POSITION_MANAGER_ADDRESS,
    functionName: 'getPoolAndPositionInfo',
    args: [tokenId],
  })

  // poolId calculation
  const poolId = Pool.getPoolId(currency0, currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks)
}

Step 3: Stored Fee State Retrieval
async function getStoredPositionInfoV4(positionDetails, tokenId, owner) {
  const salt = `0x${tokenId.toString(16).padStart(64, '0')}`
  const [liquidity, feeGrowthInside0Last, feeGrowthInside1Last] = await publicClient.readContract({
    address: STATE_VIEW_ADDRESS,
    functionName: 'getPositionInfo',
    args: [poolId, POSITION_MANAGER_ADDRESS, tickLower, tickUpper, salt],
  })
}

Step 4: Current Fee Growth Values Retrieval
Read the current fee growth in the pool for the position's range: To compute how much fees are unclaimed, we need the current fee growth inside the range and compare it to the last snapshot. We could manually fetch global fee growth and subtract out-of-range values, but StateView provides a convenience: getFeeGrowthInside(poolId, tickLower, tickUpper) will calculate the up-to-date fee growth inside that tick range for each token. This function reads the latest pool state (including global fee growth) and subtracts the parts outside the range. It accounts for any new trades that happened since the last snapshot.

async function getCurrentFeeGrowthV4(positionDetails) {
  const [feeGrowthInside0X128, feeGrowthInside1X128] = await publicClient.readContract({
    address: STATE_VIEW_ADDRESS,
    functionName: 'getFeeGrowthInside',
    args: [poolId, tickLower, tickUpper],
  })
}

Phase 2: Submitting Our Fee Collection Transaction
Collecting fees in v4 is done via the PositionManager contract's modifyLiquidities function with a specific sequence of actions. We will use the Uniswap v4 SDK to construct the required calldata and then send the transaction.

Build the fee-collection calldata with collectCallParameters
The Uniswap v4 SDK provides a helper V4PositionManager.collectCallParameters(...) that produces the calldata for the necessary multicall to collect fees. Under the hood, this will encode two actions: a DECREASE_LIQUIDITY with liquidity = 0 (and min amounts = 0) and a TAKE_PAIR to sweep both tokens to a recipient. We need to supply the SDK with our position details and our desired options. First, create a Position object for the position (this requires the pool info and position info we fetched):

async function collectFeesViaMulticall(tokenId, userAddress) {
  // Create Position object using pool and position parameters
  const position = new Position({
    pool,
    tickLower: positionDetails.tickLower,
    tickUpper: positionDetails.tickUpper,
    liquidity: positionDetails.liquidity.toString(),
  })

  // Specify collect options
  const collectOptions = {
    tokenId: tokenId,
    recipient: userAddress,
    slippageTolerance,
    deadline,
    hookData,
  }

  // Generate command with v4 SDK
  const { calldata, value } = V4PositionManager.collectCallParameters(position, collectOptions)

  // Execute with multicall
  const txHash = await walletClient.writeContract({
    account,
    chain: unichain,
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'multicall',
    args: [[calldata]],
    value: BigInt(value),
  })
}

Let's break this down: we created a Position object using the pool and position parameters. We then specify collectOptions including the NFT tokenId, a recipient address (fees will be sent to this address), and a deadline. Because fee collection is not really subject to price slippage, we can set slippage tolerance to 0 and simply expect whatever fees are available. The SDK's collectCallParameters returns an object with calldata (the encoded bytes to send to the PositionManager) and value (the ETH value to send with the transaction, if needed). In our case, value will typically be 0 because we are not providing any additional ETH; we are only withdrawing. (The value would be non-zero if one of the actions required sending ETH to the contract, e.g. if adding liquidity to an ETH pair.)

Under the hood: The calldata produced encodes exactly two actions in modifyLiquidities: Actions.DECREASE_LIQUIDITY followed by Actions.TAKE_PAIR. The first action includes our tokenId and zeros for liquidity and min amounts, and the second action includes the two token currencies and the recipient address. Using a zero liquidity decrease is a trick to trigger the pool to calculate fees owed without actually changing the liquidity. The TAKE_PAIR then instructs the contract to transfer both token0 and token1 fee amounts out to us. (If our pool involved native ETH, one of the Currency entries in this param will be Currency.wrap(0) as shown, which signals the contract to send ETH. No manual WETH unwrap is needed – v4 handles it natively.)

Phase 3: Verify the Fees Were Collected
Once the transaction is mined, you'll want to confirm that the fees made it to the recipient. There are a few ways to verify:

Check the Transaction Receipt Logs
For ERC-20 tokens, the fee amounts taken will appear as Transfer events from the pool or PositionManager contract to your address. Token contracts will emit these events when the PositionManager transfers the fees to you. You can parse the receipt for Transfer logs of token0 and token1. The amounts in those events should match the fees we calculated (or be very close, allowing for rounding).

async function verifyFeeCollection(receipt, userAddress, positionDetails, ethBalanceBefore) {
  // Search for ERC-20 Transfer events
  const transferSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  const erc20Transfers = receipt.logs
    .filter(
      (log) =>
        log.topics[0] === transferSignature && log.topics[2]?.toLowerCase().includes(userAddress.slice(2).toLowerCase())
    )
    .map((log) => ({
      token: log.address as Address,
      amount: BigInt(log.data),
    }))
}


Check Your Token Balances
You can simply measuring the balance change in your wallet before vs. after the call. For example, read your token balances (and ETH balance) prior to calling, then after the transaction confirm the increases. Because v4 might auto-wrap or unwrap ETH, if one of the tokens was ETH you should check your ETH balance difference. In ETH pools, no ERC-20 transfer event will fire for the ETH – the ETH will be sent directly to you (as an internal transfer), which is why checking the balance or the transaction's internal traces is necessary to confirm the amount.

// Check native ETH balance changes
const hasNativeETH = isNativeETH(positionDetails.poolKey.currency0)

if (hasNativeETH) {
  const ethBalanceAfter = await publicClient.getBalance({ address: userAddress })
  const ethChange = ethBalanceAfter - ethBalanceBefore

  if (ethChange > 0n) {
    collectedFees.push({
      token: '0x0000000000000000000000000000000000000000',
      amount: ethChange,
    })
  }
}

Adding and Removing Liquidity
Introduction
This guide will cover:

Setting up liquidity operations – Preparing to add/remove liquidity from v4 positions, including fetching position details, handling native ETH vs ERC20 tokens, and configuring Permit2 for ERC20 token approvals.
Adding liquidity to existing positions – Using the v4 SDK to increase liquidity with addCallParameters, handling native ETH positions, and executing transactions via PositionManager multicall.
Removing liquidity from positions – Using removeCallParameters to decrease or fully exit positions, handling proportional withdrawals, and token collection.
For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
v4 Architecture and Key Changes
Native ETH Handling
Unlike v3, Uniswap v4 has native support for ETH without wrapping to WETH. This requires special handling in the SDK:

// ✅ Correct: Using Ether.onChain() for native ETH
const token0 = Ether.onChain(chainId)

Position Manager Multicall
All v4 position operations use the PositionManager contract's multicall function with encoded action sequences:

const { calldata, value } = V4PositionManager.addCallParameters(position, options)

await walletClient.writeContract({
  address: POSITION_MANAGER_ADDRESS,
  functionName: 'multicall',
  args: [[calldata]],
  value: BigInt(value),
})

Adding Liquidity to Existing Positions
Theory: IncreaseLiquidityOptions
When adding liquidity to existing positions, we use IncreaseLiquidityOptions which combines:

CommonOptions: slippage, deadline, hookData
ModifyPositionSpecificOptions: tokenId
CommonAddLiquidityOptions: useNative, batchPermit
Step 1: Fetch Position Details
interface PositionDetails {
  tokenId: bigint
  tickLower: number
  tickUpper: number
  liquidity: bigint
  poolKey: {
    currency0: Address
    currency1: Address
    fee: number
    tickSpacing: number
    hooks: Address
  }
  token0: Currency // Can be Ether or Token
  token1: Token // Always Token in current implementation
  currentTick: number
  sqrtPriceX96: string
  poolLiquidity: string
}

async function getPositionDetails(tokenId: bigint): Promise<PositionDetails> {
  // Fetch position info from PositionManager
  const [poolKey, infoValue] = await publicClient.readContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: 'getPoolAndPositionInfo',
    args: [tokenId],
  })

  // Create proper Currency instances
  let token0: Currency
  if (isNativeETH(poolKey.currency0)) {
    token0 = Ether.onChain(chainId)
  } else {
    const decimals0 = await fetchTokenDecimals(poolKey.currency0)
    const symbol0 = await getTokenSymbol(poolKey.currency0)
    token0 = new Token(chainId, poolKey.currency0, decimals0, symbol0)
  }

  const token1 = new Token(chainId, poolKey.currency1, decimals1, symbol1)

  return {
    tokenId,
    tickLower: infoValue.tickLower,
    tickUpper: infoValue.tickUpper,
    liquidity: infoValue.liquidity,
    poolKey,
    token0,
    token1,
    // ... other fields
  }
}

Step 2: Configure Permit2 (Recommended)
const PERMIT2_TYPES = {
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
  PermitBatch: [
    { name: 'details', type: 'PermitDetails[]' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
}

async function configurePermit2(positionDetails: EnhancedPositionDetails, deadline: number) {
  const permitDetails = []

  // Add token1 (always ERC20)
  const [, , nonce1] = await publicClient.readContract({
    address: PERMIT2_ADDRESS,
    abi: PERMIT2_ABI,
    functionName: 'allowance',
    args: [userAddress, positionDetails.token1.address, POSITION_MANAGER_ADDRESS],
  })

  permitDetails.push({
    token: positionDetails.token1.address,
    amount: (2n ** 160n - 1n).toString(),
    expiration: deadline.toString(),
    nonce: nonce1.toString(),
  })

  // Add token0 only if it's not native ETH
  if (!positionDetails.token0.isNative) {
    const [, , nonce0] = await publicClient.readContract({
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: 'allowance',
      args: [userAddress, (positionDetails.token0 as Token).address, POSITION_MANAGER_ADDRESS],
    })

    permitDetails.push({
      token: (positionDetails.token0 as Token).address,
      amount: (2n ** 160n - 1n).toString(),
      expiration: deadline.toString(),
      nonce: nonce0.toString(),
    })
  }

  const permitData = {
    details: permitDetails,
    spender: POSITION_MANAGER_ADDRESS,
    sigDeadline: deadline.toString(),
  }

  // Sign Permit2 data
  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: 'Permit2',
      chainId,
      verifyingContract: PERMIT2_ADDRESS,
    },
    types: PERMIT2_TYPES,
    primaryType: 'PermitBatch',
    message: permitData,
  })

  return {
    owner: userAddress,
    permitBatch: permitData,
    signature,
  }
}

Step 3: Create Position and Add Liquidity
async function addLiquidityToPosition(
  positionDetails: EnhancedPositionDetails,
  amount0: string,
  amount1: string,
  slippageTolerance: number = 0.05
) {
  // Create Pool instance
  const pool = new Pool(
    positionDetails.token0,
    positionDetails.token1,
    positionDetails.poolKey.fee,
    positionDetails.poolKey.tickSpacing,
    positionDetails.poolKey.hooks,
    positionDetails.sqrtPriceX96,
    positionDetails.poolLiquidity,
    positionDetails.currentTick
  )

  // Create currency amounts
  const amount0Currency = CurrencyAmount.fromRawAmount(positionDetails.token0, amount0)
  const amount1Currency = CurrencyAmount.fromRawAmount(positionDetails.token1, amount1)

  // Create Position from amounts
  const position = Position.fromAmounts({
    pool,
    tickLower: positionDetails.tickLower,
    tickUpper: positionDetails.tickUpper,
    amount0: amount0Currency.quotient,
    amount1: amount1Currency.quotient,
    useFullPrecision: true,
  })

  // Configure options
  const slippagePct = new Percent(Math.floor(slippageTolerance * 100), 10_000)
  const deadline = Math.floor(Date.now() / 1000) + 1200 // 20 minutes

  const addOptions: AddLiquidityOptions = {
    // CommonOptions
    slippageTolerance: slippagePct,
    deadline: deadline.toString(),
    hookData: '0x',

    // ModifyPositionSpecificOptions
    tokenId: positionDetails.tokenId.toString(),

    // CommonAddLiquidityOptions
    ...(positionDetails.token0.isNative && { useNative: Ether.onChain(chainId) }),
    batchPermit: await configurePermit2(positionDetails, deadline),
  }

  // Generate calldata and execute
  const { calldata, value } = V4PositionManager.addCallParameters(position, addOptions)

  const txHash = await walletClient.writeContract({
    account,
    address: POSITION_MANAGER_ADDRESS,
    chain: unichain,
    abi: POSITION_MANAGER_ABI,
    functionName: 'multicall',
    args: [[calldata]],
    value: BigInt(value.toString()),
  })

  return { txHash, addedAmounts: { amount0, amount1 } }
}

Removing Liquidity from Positions
Theory: RemoveLiquidityOptions
When removing liquidity, we use RemoveLiquidityOptions which includes:

CommonOptions: slippage, deadline, hookData
ModifyPositionSpecificOptions: tokenId
RemoveLiquiditySpecificOptions: liquidityPercentage, burnToken, permit
Step 1: Calculate Liquidity to Remove
function calculateLiquidityToRemove(
  currentLiquidity: bigint,
  percentageToRemove: number // 0.25 = 25%, 1.0 = 100%
): {
  liquidityToRemove: bigint
  liquidityPercentage: Percent
} {
  const liquidityToRemove = (currentLiquidity * BigInt(Math.floor(percentageToRemove * 10000))) / 10000n
  const liquidityPercentage = new Percent(Math.floor(percentageToRemove * 100), 100)

  return { liquidityToRemove, liquidityPercentage }
}

Step 2: Remove Liquidity Implementation
async function removeLiquidityFromPosition(
  positionDetails: EnhancedPositionDetails,
  percentageToRemove: number, // 0.25 = 25%, 1.0 = 100%
  slippageTolerance: number = 0.05,
  burnTokenIfEmpty: boolean = false
) {
  const { liquidityToRemove, liquidityPercentage } = calculateLiquidityToRemove(
    positionDetails.liquidity,
    percentageToRemove
  )

  // Create Pool instance
  const pool = new Pool(
    positionDetails.token0,
    positionDetails.token1,
    positionDetails.poolKey.fee,
    positionDetails.poolKey.tickSpacing,
    positionDetails.poolKey.hooks,
    positionDetails.sqrtPriceX96,
    positionDetails.poolLiquidity,
    positionDetails.currentTick
  )

  // Create Position instance with current liquidity
  const position = new Position({
    pool,
    tickLower: positionDetails.tickLower,
    tickUpper: positionDetails.tickUpper,
    liquidity: positionDetails.liquidity.toString(),
  })

  // Configure remove options
  const slippagePct = new Percent(Math.floor(slippageTolerance * 100), 10_000)
  const deadline = Math.floor(Date.now() / 1000) + 1200

  const removeOptions: RemoveLiquidityOptions = {
    // CommonOptions
    slippageTolerance: slippagePct,
    deadline: deadline.toString(),
    hookData: '0x',

    // ModifyPositionSpecificOptions
    tokenId: positionDetails.tokenId.toString(),

    // RemoveLiquiditySpecificOptions
    liquidityPercentage,
    burnToken: burnTokenIfEmpty && percentageToRemove === 1.0,
    // permit: optional NFT permit if transaction sender doesn't own the NFT
  }

  // Generate calldata and execute
  const { calldata, value } = V4PositionManager.removeCallParameters(position, removeOptions)

  const txHash = await walletClient.writeContract({
    account,
    address: POSITION_MANAGER_ADDRESS,
    chain: unichain,
    abi: POSITION_MANAGER_ABI,
    functionName: 'multicall',
    args: [[calldata]],
    value: BigInt(value.toString()),
  })

  return {
    txHash,
    removedLiquidity: liquidityToRemove,
    percentageRemoved: percentageToRemove,
    tokenBurned: burnTokenIfEmpty && percentageToRemove === 1.0,
  }
}

Complete Example: Add/Remove Workflow
async function completeAddRemoveWorkflow() {
  const tokenId = 123456n

  // 1. Fetch position details
  const positionDetails = await getPositionDetails(tokenId)
  console.log(`Position: ${positionDetails.token0.symbol}/${positionDetails.token1.symbol}`)

  // 2. Add liquidity
  const addResult = await addLiquidityToPosition(
    positionDetails,
    '1000000000000000', // 0.001 ETH
    '1000000', // 1 USDC
    0.05 // 5% slippage
  )
  console.log(`Added liquidity: ${addResult.txHash}`)

  // 3. Wait and verify
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const updatedPosition = await getPositionDetails(tokenId)

  // 4. Remove 50% of liquidity
  const removeResult = await removeLiquidityFromPosition(
    updatedPosition,
    0.5, // 50%
    0.05, // 5% slippage
    false // don't burn token
  )
  console.log(`Removed 50% liquidity: ${removeResult.txHash}`)

  return { addResult, removeResult }
}

Fetching Pool Data
Introduction
In this example we will use ethers JS and ethers-multicall to construct a Pool object that we can use in the following guides.

This guide will cover:

Computing the PoolId out of PoolKey
Referencing the StateView contract and fetching metadata
Fetching the positions of all initialized Ticks with multicall
Fetching all ticks by their indices with a multicall
Constructing the Pool object
At the end of the guide, we will have created a Pool Object that accurately represents the state of a v4 pool at the time we fetched it.

For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
We will also use the ethers-multicall npm package:

ethers-multicall
Configuration
We will first create an example configuration CurrentConfig in config.ts. It has the format:

export const CurrentConfig: ExampleConfig = {
  env: Environment.MAINNET,
  rpc: {
    local: 'http://localhost:8545',
    mainnet: 'https://mainnet.infura.io/v3/YOUR_API_KEY',
  },
  ...
  poolKey: {
    currency0: USDC_TOKEN.address,
    currency1: ETH_TOKEN.address,
    fee: FEE_AMOUNT_LOW,
    tickSpacing: TICK_SPACING_TEN,
    hooks: EMPTY_HOOK,
  },
}

The pool used is defined by a pair of tokens in constants.ts. You can also change these two tokens and the other pool parameters in the config, just make sure a pool actually exists for your configuration. Check out the top pools on Uniswap.

export const ETH_TOKEN = new Token(
  SupportedChainId.MAINNET,
  '0x0000000000000000000000000000000000000000',
  18,
  'ETH',
  'Ether'
)

export const USDC_TOKEN = new Token(
  SupportedChainId.MAINNET,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  6,
  'USDC',
  'USDC'
)

Computing the PoolId out of PoolKey
In this example, we will construct the USDC - ETH Pool with LOW fees and without hooks. The SDK provides a method to compute the PoolId for this pool:

import { Pool } from '@uniswap/v4-sdk';

const {currency0, currency1, fee, tickSpacing, hooks} = CurrentConfig.poolKey;
const poolId = Pool.getPoolId(currency0, currency1, fee, tickSpacing, hooks);


Referencing the StateView contract and fetching metadata
Now that we have the PoolId of a USDC - ETH Pool, we need to call StateView contract to get the pool state. In v4 you need to use StateLibrary to read pool state, but offchain systems—such as frontends or analytics services—require a deployed contract with view functions. This is where StateView comes in. To construct the Contract we need to provide the address of the contract, its ABI and a provider connected to an RPC endpoint.

import { ethers } from 'ethers'
const STATE_VIEW_ADDRESS = '0x7ffe42c4a5deea5b0fec41c94c136cf115597227'; // Replace with actual StateView contract address
const STATE_VIEW_ABI = [...]; // Import or define the ABI for StateView contract

const provider = getProvider() // Provide the right RPC address for the chain
const stateViewContract = new ethers.Contract(
    STATE_VIEW_ADDRESS,
    STATE_VIEW_ABI,
    provider
)


We get the STATE_VIEW_ADDRESS for our chain from Uniswap Deployments. Once we have set up our reference to the contract, we can proceed to access its methods. To construct our offchain representation of the Pool, we need to fetch its liquidity, sqrtPrice, currently active tick and the full Tick data. We get the liquidity, sqrtPrice and tick directly from the blockchain by calling getLiquidity()and getSlot0() on the StateView contract:

  const [slot0, liquidity] = await Promise.all([
    stateViewContract.getSlot0(poolId, {
      blockTag: blockNum,
    }),
    stateViewContract.getLiquidity(poolId, {
      blockTag: blockNum,
    }),
  ])

The getSlot0 function represents the first (0th) storage slot of the pool and exposes multiple useful values in a single function:

sqrtPriceX96: The current pool price in Q64.96 fixed-point format.
tick: The current tick in which the pool is operating.
protocolFee and lpFee: Fee parameters for protocol and LP fee tiers.
For our use case, we only need the sqrtPriceX96 and the currently active tick.

Fetching all Ticks
v4 pools use ticks to concentrate liquidity in price ranges and allow for better pricing of trades. Even though most Pools only have a couple of initialized ticks, it is possible that a pools liquidity is defined by thousands of initialized ticks. In that case, it can be very expensive or slow to get all of them with normal RPC calls.

If you are not familiar with the concept of ticks, check out the introduction.

To access tick data, we will use the getTickInfo function of the State View contract:

  function getTickInfo(PoolId poolId, int24 tick)
    external
    view
    returns (
        uint128 liquidityGross,
        int128 liquidityNet,
        uint256 feeGrowthOutside0X128,
        uint256 feeGrowthOutside1X128
    )

The tick parameter that we provide the function with is the index (memory position) of the Tick we are trying to fetch. To get the indices of all initialized Ticks of the Pool, we can calculate them from the tickBitmaps. To fetch a tickBitmap we use a getTickBitmap function of the State View contract:

  function getTickBitmap(
      PoolId poolId,
      int16 wordPosition
  ) external view returns (uint256 tickBitmap)

A pool stores lots of bitmaps, each of which contain the status of 256 Ticks. The parameter int16 wordPosition the function accepts is the position of the bitMap we want to fetch. We can calculate all the position of bitMaps (or words as they are sometimes called) from the tickSpacing of the Pool, which is in turn dependant on the Fee tier.

So to summarise we need 4 steps to fetch all initialized ticks:

Calculate all bitMap positions from the tickSpacing of the Pool.
Fetch all bitMaps using their positions.
Calculate the memory positions of all Ticks from the bitMaps.
Fetch all Ticks by their memory position.
We will use multicalls for the fetch calls.

Multicall
Multicall contracts aggregate results from multiple contract calls and therefore allow sending multiple contract calls in one RPC request. This can improve the speed of fetching large amounts of data significantly and ensures that the data fetched is all from the same block.

We will use the Multicall2 contract by MakerDAO. We use the ethers-muticall npm package to easily interact with the Contract.

Calculating all bitMap positions
As mentioned, Uniswap v4 Pools store bitmaps, also called words, that represent the state of 256 initializable ticks at a time. The value at a bit of a word is 1 if the tick at this index is initialized and 0 if it isn't. We can calculate the positions of initialized ticks from the words of the Pool.

All ticks of Uniswap v4 pools are between the indices -887272 and 887272. We can calculate the minimum and maximum word from these indices and the Pool's tickSpacing:

function tickToWord(tick: number): number {
  let compressed = Math.floor(tick / tickSpacing)
  if (tick < 0 && tick % tickSpacing !== 0) {
    compressed -= 1
  }
  return compressed >> 8
}

const minWord = tickToWord(-887272)
const maxWord = tickToWord(887272)

Ticks can only be initialized at indices that are divisible by the tickSpacing. One word contains 256 ticks, so we can compress the ticks by right shifting 8 bit.

Fetching bitMaps from their position
Knowing the positions of words, we can now fetch them using multicall.

First we initialize our multicall providers and State View Contract:

import { ethers } from 'ethers'
import { Contract, Provider } from 'ethers-multicall'

const ethersProvider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL")
const multicallProvider = new Provider(ethersProvider)
await multicallProvider.init()

const stateViewContract = new Contract(STATE_VIEW_ADDRESS, STATE_VIEW_ABI)

The multicallProvider creates the multicall request and sends it via the ethers Provider.

Next we loop through all possible word positions and add a getTickBitmap call for each:

let calls: any[] = []
let wordPosIndices: number[] = []
for (let i = minWord; i <= maxWord; i++) {
  wordPosIndices.push(i)
  calls.push(stateViewContract.getTickBitmap(poolId, i))
}

We also keep track of the word position indices to be able to loop through them in the same order we added the calls to the array.

We use the multicallProvider.all() function to send a multicall and map the results:

const results: bigint[] = (await multicallProvider.all(calls)).map(
    (ethersResponse) => {
      return BigInt(ethersResponse.toString())
    }
  )

A great visualization of what the bitMaps look like can be found in the [Uniswap v3 development book](https://uniswapv3book.com/docs/milestone_2/tick-bitmap-index/](https://uniswapv3book.com/milestone_2/tick-bitmap-index.html):

TickBitmap
We encourage anyone trying to get a deeper understanding of the Uniswap protocol to read the Book.

Calculating the memory positions of all Ticks
Now that we fetched all bitMaps, we check which ticks are initialized and calculate the tick position from the word index and the tickSpacing of the pool.

We check if a tick is initialized inside the word by shifting a bit by the index we are looking at and performing a bitwise AND operation:

const bit = 1n
const initialized = (bitmap & (bit << BigInt(i))) !== 0n

If the tick is initialized, we revert the compression from tick to word we made earlier by multiplying the word index with 256, which is the same as left shifting by 8 bit, adding the position we are currently at, and multiplying with the tickSpacing:

const tickIndex = (ind * 256 + i) * tickSpacing

The whole loop looks like this:

const tickIndices: number[] = []

  for (let j = 0; j < wordPosIndices.length; j++) {
    const ind = wordPosIndices[j]
    const bitmap = results[j]

    if (bitmap !== 0n) {
      for (let i = 0; i < 256; i++) {
        const bit = 1n
        const initialized = (bitmap & (bit << BigInt(i))) !== 0n
        if (initialized) {
          const tickIndex = (ind * 256 + i) * tickSpacing
          tickIndices.push(tickIndex)
        }
      }
    }
  }

We now have an array containing the indices of all initialized Ticks.

Fetching all Ticks by their indices
We use the multicallProvider again to execute an aggregated read call for all tick indices. We create an array of call Promises again and use .all() to make our multicall:

const calls: any[] = []

for (const index of tickIndices) {
  calls.push(stateViewContract.getTickInfo(poolId, index))
}

const results = await multicallProvider.all(calls)

Again, the order of the results array is the same as the elements in tickIndices.

We are able to combine the tickIndices and results array to create an array of Tick objects:

const allTicks: Tick[] = []

  for (let i = 0; i < tickIndices.length; i++) {
    const index = tickIndices[i]
    const ethersResponse = results[i]
    const tick = new Tick({
      index,
      liquidityGross: JSBI.BigInt(ethersResponse.liquidityGross.toString()),
      liquidityNet: JSBI.BigInt(ethersResponse.liquidityNet.toString()),
    })
    allTicks.push(tick)
  }

We need to parse the response from our RPC provider to JSBI values that the v4-sdk can work with.

Constructing the Pool
We have everything to construct our Pool now:

const usdcWethPool = new Pool(
    USDC,
    WETH,
    feeAmount,
    slot0.sqrtPriceX96,
    liquidity,
    slot0.tick,
    allTicks
)

With this fully initialized Pool, we can make accurate offchain calculations.

Create Pool
Introduction
In this example we will use ethers.js and the Uniswap v4 SDK to create pools on Uniswap v4. Uniswap v4 is a popular destination for creating markets due to its:

Proven track record and battle-tested codebase
Concentrated liquidity, unlocks capital efficiency
Flexible pool design through dynamic fees and hooks
Gas-efficient architecture
Integrations with alternative trading venues
For more information, developers should see Uniswap v4 Overview

For this guide, the following Uniswap packages are used:

@uniswap/v4-sdk
@uniswap/sdk-core
Configuration
To initialize a Uniswap v4 Pool without initial liquidity, developers should call PoolManager.initialize()

Creating a pool without liquidity may be useful for "reserving" a pool for future use, when initial liquidity is not available, or when external market makers would provide the starting liquidity.

Configure the Pool
We will first create an example configuration CurrentConfig in config.ts. It has the format:

export const CurrentConfig: ExampleConfig = {
  env: Environment.MAINNET,
  rpc: {
    local: 'http://localhost:8545',
    mainnet: 'https://mainnet.infura.io/v3/YOUR_API_KEY',
  },
  ...
  poolKey: {
    currency0: currency0,
    currency1: currency1,
    fee: lpFee,
    tickSpacing: tickSpacing,
    hooks: HOOK_CONTRACT_ADDRESS,
  },
}

For native token pairs (Ether), use ADDRESS_ZERO as currency0

PoolKey uniquely identifies a pool

Currencies should be sorted, uint160(currency0) < uint160(currency1)
lpFee is the fee expressed in pips, i.e. 3000 = 0.30%
tickSpacing is the granularity of the pool. Lower values are more precise but may be more expensive to trade on
hookContract is the address of the hook contract
A note on tickSpacing:

Lower tick spacing provides improved price precision; however, smaller tick spaces will cause swaps to cross ticks more often, incurring higher gas costs.

Call initialize of Pool Manager contract
Now to initialize the Pool we need to call the initialize function of the Pool Manager Contract. To construct the Pool Manager Contract we need to provide the address of the contract, its ABI and a provider connected to an RPC endpoint.

import { ethers } from 'ethers'
const POOL_MANAGER_ADDRESS = '0x000000000004444c5dc75cB358380D2e3dE08A90' // Replace with actual StateView contract address
const POOL_MANAGER_ABI = [...]; // Import or define the ABI for PoolManager contract

const provider = getProvider() // Provide the right RPC address for the chain
const signer = new ethers.Wallet(PRIVATE_KEY, provider)
const poolManager = new ethers.Contract(
    POOL_MANAGER_ADDRESS,
    POOL_MANAGER_ABI,
    signer
)


We get the POOL_MANAGER_ADDRESS for our chain from Uniswap Deployments.

Pools are initialized with a starting price

const result = await poolManager.initialize(
    CurrentConfig.poolKey,
    startingPrice
)

the startingPrice is expressed as sqrtPriceX96: floor(sqrt(token1 / token0) * 2^96)
i.e. 79228162514264337593543950336 is the starting price for a 1:1 pool
Now the pool is initialized and you can add liquidity to it.

Important Note on Initial Liquidity
When creating a new pool, it's critical to understand that initializing a pool without liquidity can be dangerous. An empty pool's spot price is freely manipulatable since there is no liquidity to resist price movements.

This means that on the first liquidity provision, if proper slippage parameters are not set:

Malicious actors can manipulate the price before the first position is minted
The first position can be mispriced and have incorrect asset ratios
To safely add the first liquidity to a new pool:

Always use appropriate slippage parameters when minting the first position
Consider adding liquidity immediately after pool creation in the same transaction. Reference our Mint Position guide for proper liquidity addition practices.
V4BaseActionsParser
@uniswap/v4-sdk / V4BaseActionsParser

Defined in: utils/v4BaseActionsParser.ts:52

Constructors
new V4BaseActionsParser()
new V4BaseActionsParser(): V4BaseActionsParser

Returns
V4BaseActionsParser

Methods
parseCalldata()
static parseCalldata(calldata): V4RouterCall

Defined in: utils/v4BaseActionsParser.ts:53

Parameters
Parameter	Type
calldata	string
Returns
V4RouterCall
V4RouterCall
V4RouterCall: object

Defined in: utils/v4BaseActionsParser.ts:17

Type declaration
actions
readonly actions: readonly V4RouterAction[]

V4Planner
@uniswap/v4-sdk / V4Planner

Defined in: utils/v4Planner.ts:167

Extended by
V4PositionPlanner
Constructors
new V4Planner()
new V4Planner(): V4Planner

Defined in: utils/v4Planner.ts:171

Returns
V4Planner

Properties
actions
actions: string

Defined in: utils/v4Planner.ts:168

params
params: string[]

Defined in: utils/v4Planner.ts:169

Methods
addAction()
addAction(type, parameters): V4Planner

Defined in: utils/v4Planner.ts:176

Parameters
Parameter	Type
type	Actions
parameters	any[]
Returns
V4Planner

addSettle()
addSettle(currency, payerIsUser, amount?): V4Planner

Defined in: utils/v4Planner.ts:213

Parameters
Parameter	Type
currency	Currency
payerIsUser	boolean
amount?	BigNumber
Returns
V4Planner

addTake()
addTake(currency, recipient, amount?): V4Planner

Defined in: utils/v4Planner.ts:218

Parameters
Parameter	Type
currency	Currency
recipient	string
amount?	BigNumber
Returns
V4Planner

addTrade()
addTrade(trade, slippageTolerance?): V4Planner

Defined in: utils/v4Planner.ts:183

Parameters
Parameter	Type
trade	Trade<Currency, Currency, TradeType>
slippageTolerance?	Percent
Returns
V4Planner

finalize()
finalize(): string

Defined in: utils/v4Planner.ts:224

Returns
string
V4PositionManager
@uniswap/v4-sdk / V4PositionManager

Defined in: PositionManager.ts:206

Properties
INTERFACE
static INTERFACE: Interface

Defined in: PositionManager.ts:207

Methods
addCallParameters()
static addCallParameters(position, options): MethodParameters

Defined in: PositionManager.ts:224

Parameters
Parameter	Type
position	Position
options	AddLiquidityOptions
Returns
MethodParameters

collectCallParameters()
static collectCallParameters(position, options): MethodParameters

Defined in: PositionManager.ts:387

Produces the calldata for collecting fees from a position

Parameters
Parameter	Type	Description
position	Position	The position to collect fees from
options	CollectOptions	Additional information necessary for generating the calldata
Returns
MethodParameters

The call parameters

createCallParameters()
static createCallParameters(poolKey, sqrtPriceX96): MethodParameters

Defined in: PositionManager.ts:217

Public methods to encode method parameters for different actions on the PositionManager contract

Parameters
Parameter	Type
poolKey	PoolKey
sqrtPriceX96	BigintIsh
Returns
MethodParameters

encodeERC721Permit()
static encodeERC721Permit(spender, tokenId, deadline, nonce, signature): string

Defined in: PositionManager.ts:435

Parameters
Parameter	Type
spender	string
tokenId	BigintIsh
deadline	BigintIsh
nonce	BigintIsh
signature	string
Returns
string

encodeModifyLiquidities()
static encodeModifyLiquidities(unlockData, deadline): string

Defined in: PositionManager.ts:421

Parameters
Parameter	Type
unlockData	string
deadline	BigintIsh
Returns
string

encodePermitBatch()
static encodePermitBatch(owner, permitBatch, signature): string

Defined in: PositionManager.ts:426

Parameters
Parameter	Type
owner	string
permitBatch	AllowanceTransferPermitBatch
signature	string
Returns
string

getPermitData()
static getPermitData(permit, positionManagerAddress, chainId): NFTPermitData

Defined in: PositionManager.ts:452

Parameters
Parameter	Type
permit	NFTPermitValues
positionManagerAddress	string
chainId	number
Returns
NFTPermitData

removeCallParameters()
static removeCallParameters(position, options): MethodParameters

Defined in: PositionManager.ts:314

Produces the calldata for completely or partially exiting a position

Parameters
Parameter	Type	Description
position	Position	The position to exit
options	RemoveLiquidityOptions	Additional information necessary for generating the calldata
Returns
MethodParameters

The call parameters

V4PositionPlanner
@uniswap/v4-sdk / V4PositionPlanner

Defined in: utils/v4PositionPlanner.ts:8

Extends
V4Planner
Constructors
new V4PositionPlanner()
new V4PositionPlanner(): V4PositionPlanner

Defined in: utils/v4Planner.ts:171

Returns
V4PositionPlanner

Inherited from
V4Planner.constructor

Properties
actions
actions: string

Defined in: utils/v4Planner.ts:168

Inherited from
V4Planner.actions

params
params: string[]

Defined in: utils/v4Planner.ts:169

Inherited from
V4Planner.params

Methods
addAction()
addAction(type, parameters): V4Planner

Defined in: utils/v4Planner.ts:176

Parameters
Parameter	Type
type	Actions
parameters	any[]
Returns
V4Planner

Inherited from
V4Planner.addAction

addBurn()
addBurn(tokenId, amount0Min, amount1Min, hookData): void

Defined in: utils/v4PositionPlanner.ts:58

Parameters
Parameter	Type	Default value
tokenId	BigintIsh	undefined
amount0Min	BigintIsh	undefined
amount1Min	BigintIsh	undefined
hookData	string	EMPTY_BYTES
Returns
void

addDecrease()
addDecrease(tokenId, liquidity, amount0Min, amount1Min, hookData): void

Defined in: utils/v4PositionPlanner.ts:46

Parameters
Parameter	Type	Default value
tokenId	BigintIsh	undefined
liquidity	BigintIsh	undefined
amount0Min	BigintIsh	undefined
amount1Min	BigintIsh	undefined
hookData	string	EMPTY_BYTES
Returns
void

addIncrease()
addIncrease(tokenId, liquidity, amount0Max, amount1Max, hookData): void

Defined in: utils/v4PositionPlanner.ts:34

Parameters
Parameter	Type	Default value
tokenId	BigintIsh	undefined
liquidity	BigintIsh	undefined
amount0Max	BigintIsh	undefined
amount1Max	BigintIsh	undefined
hookData	string	EMPTY_BYTES
Returns
void

addMint()
addMint(pool, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner, hookData): void

Defined in: utils/v4PositionPlanner.ts:10

Parameters
Parameter	Type	Default value
pool	Pool	undefined
tickLower	number	undefined
tickUpper	number	undefined
liquidity	BigintIsh	undefined
amount0Max	BigintIsh	undefined
amount1Max	BigintIsh	undefined
owner	string	undefined
hookData	string	EMPTY_BYTES
Returns
void

addSettle()
addSettle(currency, payerIsUser, amount?): V4Planner

Defined in: utils/v4Planner.ts:213

Parameters
Parameter	Type
currency	Currency
payerIsUser	boolean
amount?	BigNumber
Returns
V4Planner

Inherited from
V4Planner.addSettle

addSettlePair()
addSettlePair(currency0, currency1): void

Defined in: utils/v4PositionPlanner.ts:64

Parameters
Parameter	Type
currency0	Currency
currency1	Currency
Returns
void

addSweep()
addSweep(currency, to): void

Defined in: utils/v4PositionPlanner.ts:76

Parameters
Parameter	Type
currency	Currency
to	string
Returns
void

addTake()
addTake(currency, recipient, amount?): V4Planner

Defined in: utils/v4Planner.ts:218

Parameters
Parameter	Type
currency	Currency
recipient	string
amount?	BigNumber
Returns
V4Planner

Inherited from
V4Planner.addTake

addTakePair()
addTakePair(currency0, currency1, recipient): void

Defined in: utils/v4PositionPlanner.ts:70

Parameters
Parameter	Type
currency0	Currency
currency1	Currency
recipient	string
Returns
void

addTrade()
addTrade(trade, slippageTolerance?): V4Planner

Defined in: utils/v4Planner.ts:183

Parameters
Parameter	Type
trade	Trade<Currency, Currency, TradeType>
slippageTolerance?	Percent
Returns
V4Planner

Inherited from
V4Planner.addTrade

finalize()
finalize(): string

Defined in: utils/v4Planner.ts:224

Returns
string

Inherited from
V4Planner.finalize

v4 Protocol Query Examples
Subgraph Query Examples
This doc will teach you how to query Uniswap v4 analytics by writing GraphQL queries on the subgraph. You can fetch data points like:

position details
current liquidity of a pool
volume on a certain day
and much more. Below are some example queries. To run a query copy and paste it into the v4 explorer to get fresh data.

Global Data
Global data refers to data points about the Uniswap v4 protocol as a whole. Some examples of global data points are:

Total value locked in the protocol,
Total pools deployed,
Total transaction counts.
Thus, to query global data you must pass in the PoolManager address 0x000000000004444c5dc75cb358380d2e3de08a90 and select the desired fields. Reference the full poolManager schema to see all possible fields. PoolManager addresses for all supported chains are listed in the Deployments section.

Current Global Data
An example querying total pool count, transaction count, and total volume in USD and ETH:

{
  poolManager(id: "0x000000000004444c5dc75cb358380d2e3de08a90") {
    poolCount
    txCount
    totalVolumeUSD
    totalVolumeETH
  }
}

Historical Global Data
You can also query historical data by specifying a block number.

{
  poolManager(
    id: "0x000000000004444c5dc75cb358380d2e3de08a90", 
    block: {
      number: 22451931
    }
  ) {
    poolCount
    txCount
    totalVolumeUSD
    totalVolumeETH
  }
}

Pool Data
To get data about a certain pool, pass in the pool address. Reference the full pool schema and adjust the query fields to retrieve the data points you want.

General Pool Query
The query below returns the feeTier, spot price, and liquidity for the ETH-USDC pool.

{
  pool(id: "0x21c67e77068de97969ba93d4aab21826d33ca12bb9f565d8496e8fda8a82ca27") {
    tick
    token0 {
      symbol
      id
      decimals
    }
    token1 {
      symbol
      id
      decimals
    }
    feeTier
    sqrtPrice
    liquidity
  }
}

All Possible Pools
The maximum items you can query at once is 1000. Thus to get all possible pools, you can iterate using the skip variable. To get pools beyond the first 1000 you can also set the skip as shown below.

Skipping First 1000 Pools
This query sets the skip value and returns the first 10 responses after the first 1000.

{
  pools(first: 10, skip: 1000) {
    id
    token0 {
      id
      symbol
    }
    token1 {
      id
      symbol
    }
  }
}

Creating a Skip Variable
This next query sets a skip variable. In your language and environment of choice you can then iterate through a loop, query to get 1000 pools each time, and continually adjust skip by 1000 until all pool responses are returned.

Check out this example from our interface for poolDayData that does something similar.

Note This query will not work in the graph explorer and more resembles the structure of a query you'd pass to some GraphQL middleware like Apollo.

query pools($skip: Int!) {
  pools(
    first: 1000
    skip: $skip
    orderDirection: asc
  ) {
    id
    sqrtPrice
    token0 {
      id
    }
    token1 {
      id
    }
  }
}

Most Liquid Pools
Retrieve the top 1000 most liquid pools. You can use this similar set up to orderBy other variables like number of swaps or volume.

{
  pools(
    first: 1000, 
    orderBy: liquidity, 
    orderDirection: desc
  ) {
    id
  }
}

Pool Daily Aggregated
This query returns daily aggregated data for the first 10 days since the given timestamp for the UNI-ETH pool. To calculate poolId, refer to PoolId Library.

{
  poolDayDatas(
    first: 10, 
    orderBy: date, 
    where: {
      pool: "0x21c67e77068de97969ba93d4aab21826d33ca12bb9f565d8496e8fda8a82ca27",
      date_gt: 1735689600
    } 
  ) {
    date
    liquidity
    sqrtPrice
    token0Price
    token1Price
    volumeToken0
    volumeToken1
  }
}

Swap Data
General Swap Data
To query data about a particular swap, input the transaction hash + "-" + the index in the swaps the transaction array. This is the reference for the full swap schema.

This query fetches data about the sender, amounts, transaction data, timestamp, and tokens for a particular swap.

{
   swap(id: "0x0000329e0d864d8e7c93627b76f6b5b99bd776cb18d9f8829e7da469f563e7d4-212") {
    sender
    amount0
    amount1
    transaction {
      id
      blockNumber
      gasUsed
      gasPrice
    }
    timestamp
    token0 {
      id
      symbol
    }
    token1 {
      id
      symbol
    }
   }
 }

Recent Swaps Within a Pool
You can set the where field to filter swap data by pool address. This example fetches data about multiple swaps for the ETH-USDT pool, ordered by timestamp.

{
  swaps(
    orderBy: timestamp,
    orderDirection: desc,
    where: {
      pool: "0x21c67e77068de97969ba93d4aab21826d33ca12bb9f565d8496e8fda8a82ca27"
    }
  ) {
    pool {
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
    }
    sender
    amount0
    amount1
  }
}

Token Data
Input the token contract address to fetch token data. Any token that exists in at least one Uniswap v4 pool can be queried. The output will aggregate data across all v4 pools that include the token.

General Token Data
This queries the decimals, symbol, name, pool count, and volume in USD for the UNI token. Reference the full token schema for all possible fields you can query.

{
  token(id:"0x1f9840a85d5af5bf1d1762f925bdaddc4201f984") {
    symbol
    name
    decimals
    volumeUSD
    poolCount
  }
}

Token Daily Aggregated
You can fetch aggregate data about a specific token over a 24-hour period. This query gets 10-days of the 24-hour volume data for the UNI token ordered from oldest to newest.

{
  tokenDayDatas(
    first: 10, 
    where: {
      token: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"
    }, 
    orderBy: date, 
    orderDirection: asc
  ) {
    date
    token {
      id
      symbol
    }
    volumeUSD
  }
}

All Tokens
Similar to retrieving all pools, you can fetch all tokens by using skip.

Note This query will not work in the graph explorer and more resembles the structure of a query you'd pass to some GraphQL middleware like Apollo.

query tokens($skip: Int!) {
  tokens(first: 1000, skip: $skip) {
    id
    symbol
    name
  }
}

Position Data
General Position Data
To get data about a specific position, input the NFT tokenId. This queries the subscriptions, unsubscriptions, and transfers for the position with tokenId 3. Reference the full position schema to see all fields.

{
  position(id:3) {
    id
    subscriptions {
      id
    }
    unsubscriptions {
      id
    }
    transfers {
      id
    }
  }
}

Contribute
There are many more queries you can do with the Uniswap v4 subgraph including data related to ticks, subscriptions, unsubscriptions, and more. Once again you can reference the full schema here. If you'd like to suggest more example queries to showcase, feel free to drop some suggestions in discord under #dev-chat or contribute your own queries by submitting a pull request to the docs repo.



github links:
https://github.com/Uniswap/sdks/tree/main/sdks/v4-sdk
