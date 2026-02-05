// Shadow Orders Hook ABI - Core functions
export const SHADOW_ORDERS_HOOK_ABI = [
    // Order Management
    {
        inputs: [
            { name: "poolId", type: "bytes32" },
            { name: "encryptedLimitPrice", type: "bytes" },
            { name: "encryptedAmount", type: "bytes" },
            { name: "inputProof", type: "bytes" },
            { name: "isBuy", type: "bool" },
        ],
        name: "createOrder",
        outputs: [{ name: "orderId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "poolId", type: "bytes32" },
            { name: "orderId", type: "uint256" },
        ],
        name: "cancelOrder",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // View Functions
    {
        inputs: [
            { name: "poolId", type: "bytes32" },
            { name: "orderId", type: "uint256" },
        ],
        name: "getOrder",
        outputs: [
            {
                components: [
                    { name: "owner", type: "address" },
                    { name: "encryptedLimitPrice", type: "uint256" },
                    { name: "encryptedAmount", type: "uint256" },
                    { name: "isBuy", type: "bool" },
                    { name: "isActive", type: "bool" },
                    { name: "createdAt", type: "uint256" },
                ],
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "poolId", type: "bytes32" }],
        name: "getActiveOrders",
        outputs: [{ name: "", type: "uint256[]" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "poolId", type: "bytes32" },
            { name: "user", type: "address" },
        ],
        name: "getUserOrders",
        outputs: [{ name: "", type: "uint256[]" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "poolId", type: "bytes32" }],
        name: "getOrderCount",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "poolId", type: "bytes32" },
            { indexed: true, name: "orderId", type: "uint256" },
            { indexed: true, name: "owner", type: "address" },
            { indexed: false, name: "isBuy", type: "bool" },
        ],
        name: "OrderCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "poolId", type: "bytes32" },
            { indexed: true, name: "orderId", type: "uint256" },
        ],
        name: "OrderCancelled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "poolId", type: "bytes32" },
            { indexed: true, name: "orderId", type: "uint256" },
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
