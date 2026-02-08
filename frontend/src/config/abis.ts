// Shadow Orders Hook ABI - Core functions
// Must match ShadowOrdersHook.sol exactly
export const SHADOW_ORDERS_HOOK_ABI = [
    // Order Management
    {
        inputs: [
            {
                name: "poolKey",
                type: "tuple",
                components: [
                    { name: "currency0", type: "address" },
                    { name: "currency1", type: "address" },
                    { name: "fee", type: "uint24" },
                    { name: "tickSpacing", type: "int24" },
                    { name: "hooks", type: "address" },
                ],
            },
            { name: "limitPriceInput", type: "bytes" },
            { name: "amountInput", type: "bytes" },
            { name: "isBuyOrderInput", type: "bytes" },
        ],
        name: "createOrder",
        outputs: [{ name: "orderId", type: "uint256" }],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            { name: "orderId", type: "uint256" },
        ],
        name: "cancelOrder",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // View Functions
    {
        inputs: [{ name: "orderId", type: "uint256" }],
        name: "getOrderInfo",
        outputs: [
            { name: "owner", type: "address" },
            { name: "isActive", type: "bool" },
            { name: "poolId", type: "bytes32" },
            { name: "createdAt", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "owner", type: "address" }],
        name: "getOrdersByOwner",
        outputs: [{ name: "", type: "uint256[]" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "poolId", type: "bytes32" }],
        name: "getActiveOrderCount",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getTotalOrderCount",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "nextOrderId",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "keeper",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "orderId", type: "uint256" },
            { indexed: true, name: "owner", type: "address" },
            { indexed: true, name: "poolId", type: "bytes32" },
            { indexed: false, name: "createdAt", type: "uint256" },
        ],
        name: "OrderCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "orderId", type: "uint256" },
            { indexed: true, name: "owner", type: "address" },
        ],
        name: "OrderCancelled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "orderId", type: "uint256" },
            { indexed: true, name: "owner", type: "address" },
            { indexed: true, name: "executor", type: "address" },
            { indexed: false, name: "executionPrice", type: "uint256" },
            { indexed: false, name: "keeperFee", type: "uint256" },
        ],
        name: "OrderExecuted",
        type: "event",
    },
] as const;

// ERC20 ABI - Minimal for token interactions
export const ERC20_ABI = [
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    // Mock token mint function
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;
