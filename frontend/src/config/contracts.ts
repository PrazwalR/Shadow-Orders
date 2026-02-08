// Shadow Orders Contract Configuration
// Deployed on Base Sepolia (Testnet - Chain ID: 84532)

export const CONTRACTS = {
    // Core Hook Contract
    SHADOW_ORDERS_HOOK: "0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4" as const,

    // Keeper Address (executes swaps on behalf of users)
    KEEPER_ADDRESS: "0x5E48Fda9d06f646aa6Bc4714462Ecb21327bC30a" as const,

    // Uniswap V4 Contracts
    POOL_MANAGER: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" as const,
    POOL_SWAP_TEST: "0x8b5bcc363dde2614281ad875bad385e0a785d3b9" as const,
    POOL_MODIFY_LIQUIDITY_TEST: "0x37429cD17Cb1454C34E7F50b09725202Fd533039" as const,

    // Mock Tokens
    MOCK_USDC: "0x0e89F47C600bd253838F052795ca5dC41B932115" as const,
    MOCK_DAI: "0x78176aBA471cD5D5e4994907C2D0b9650bd48d58" as const,
    MOCK_WBTC: "0x21C40b2865699F05A8aFBc59230939dD88B589aC" as const,
    MOCK_WETH: "0x249518Cf9609378c6aF940C9FB8E31b42738aC31" as const,
} as const;

// Pool IDs - Pools are created around WETH as the hub token
export const POOL_IDS = {
    USDC_WETH: "0xa4d7fc790310ea9fa78f16133c414b26352c4ff65004955cf0419510b801b247" as const,
    WETH_DAI: "0x9f5f7de126f3bca3e0701e1502a01129e7da6bbc3cbb8f9e6b4990ff25aa00ab" as const,
    WBTC_WETH: "0x612871a8091fa7ada2536f93fbb87ce0f4bbd2b9a54fdfc14ad71ace294226fe" as const,
} as const;

// Token Metadata
export const TOKENS = {
    mUSDC: {
        address: CONTRACTS.MOCK_USDC,
        symbol: "mUSDC",
        name: "Mock USDC",
        decimals: 6,
        icon: "💵",
        coingeckoId: "usd-coin",
    },
    mDAI: {
        address: CONTRACTS.MOCK_DAI,
        symbol: "mDAI",
        name: "Mock DAI",
        decimals: 18,
        icon: "🔶",
        coingeckoId: "dai",
    },
    mWBTC: {
        address: CONTRACTS.MOCK_WBTC,
        symbol: "mWBTC",
        name: "Mock WBTC",
        decimals: 8,
        icon: "₿",
        coingeckoId: "wrapped-bitcoin",
    },
    mWETH: {
        address: CONTRACTS.MOCK_WETH,
        symbol: "mWETH",
        name: "Mock WETH",
        decimals: 18,
        icon: "⟠",
        coingeckoId: "ethereum",
    },
} as const;

// Mock Tokens Array (for iteration)
export const MOCK_TOKENS = [
    TOKENS.mUSDC,
    TOKENS.mDAI,
    TOKENS.mWBTC,
    TOKENS.mWETH,
] as const;

// Pool configuration for routing
// WETH is the hub token - all pools go through WETH
export const POOLS = [
    {
        id: "usdc-weth",
        token0: "mUSDC",
        token1: "mWETH",
        poolId: POOL_IDS.USDC_WETH,
        fee: 3000,
        tickSpacing: 60,
    },
    {
        id: "weth-dai",
        token0: "mWETH",
        token1: "mDAI",
        poolId: POOL_IDS.WETH_DAI,
        fee: 3000,
        tickSpacing: 60,
    },
    {
        id: "wbtc-weth",
        token0: "mWBTC",
        token1: "mWETH",
        poolId: POOL_IDS.WBTC_WETH,
        fee: 3000,
        tickSpacing: 60,
    },
] as const;

// Helper function to find route between two tokens
// Returns array of pool IDs to traverse
export function findRoute(fromToken: string, toToken: string): { route: string[]; isMultiHop: boolean } {
    // Direct pool check
    const directPool = POOLS.find(
        (p) =>
            (p.token0 === fromToken && p.token1 === toToken) ||
            (p.token0 === toToken && p.token1 === fromToken)
    );

    if (directPool) {
        return { route: [directPool.poolId], isMultiHop: false };
    }

    // Multi-hop through WETH (hub token)
    if (fromToken !== "mWETH" && toToken !== "mWETH") {
        const firstPool = POOLS.find(
            (p) =>
                (p.token0 === fromToken && p.token1 === "mWETH") ||
                (p.token0 === "mWETH" && p.token1 === fromToken)
        );
        const secondPool = POOLS.find(
            (p) =>
                (p.token0 === "mWETH" && p.token1 === toToken) ||
                (p.token0 === toToken && p.token1 === "mWETH")
        );

        if (firstPool && secondPool) {
            return { route: [firstPool.poolId, secondPool.poolId], isMultiHop: true };
        }
    }

    return { route: [], isMultiHop: false };
}

// Get pool for a token pair
export function getPoolForPair(token0: string, token1: string) {
    return POOLS.find(
        (p) =>
            (p.token0 === token0 && p.token1 === token1) ||
            (p.token0 === token1 && p.token1 === token0)
    );
}

// Chain Configuration
export const CHAIN_CONFIG = {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
    },
} as const;

// Token type for type safety
export type TokenInfo = typeof TOKENS[keyof typeof TOKENS];
