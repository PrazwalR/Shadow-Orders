import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

// Contract addresses
const SHADOW_ORDERS_HOOK = "0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4";
const POOL_SWAP_TEST = "0x8b5bcc363dde2614281ad875bad385e0a785d3b9";

// Token configs
const TOKEN_CONFIG: { [key: string]: { address: string; decimals: number } } = {
    mUSDC: { address: "0x0e89F47C600bd253838F052795ca5dC41B932115", decimals: 6 },
    mDAI: { address: "0x78176aBA471cD5D5e4994907C2D0b9650bd48d58", decimals: 18 },
    mWBTC: { address: "0x21C40b2865699F05A8aFBc59230939dD88B589aC", decimals: 8 },
    mWETH: { address: "0x249518Cf9609378c6aF940C9FB8E31b42738aC31", decimals: 18 },
};

// Sqrt price limits for swap direction
const MIN_SQRT_PRICE_LIMIT = BigInt("4295128739") + BigInt(1);
const MAX_SQRT_PRICE_LIMIT = BigInt("1461446703485210103287273052203988822378723970342") - BigInt(1);

// ERC20 ABI (minimal)
const ERC20_ABI = [
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transferFrom", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

// ShadowOrdersHook ABI (executeOrder only)
const HOOK_ABI = [
    {
        inputs: [
            { name: "orderId", type: "uint256" },
            {
                name: "poolKey", type: "tuple",
                components: [
                    { name: "currency0", type: "address" },
                    { name: "currency1", type: "address" },
                    { name: "fee", type: "uint24" },
                    { name: "tickSpacing", type: "int24" },
                    { name: "hooks", type: "address" },
                ],
            },
            { name: "currentPrice", type: "uint256" },
        ],
        name: "executeOrder",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

// PoolSwapTest ABI
const POOL_SWAP_TEST_ABI = [
    {
        inputs: [
            {
                name: "key", type: "tuple",
                components: [
                    { name: "currency0", type: "address" },
                    { name: "currency1", type: "address" },
                    { name: "fee", type: "uint24" },
                    { name: "tickSpacing", type: "int24" },
                    { name: "hooks", type: "address" },
                ],
            },
            {
                name: "params", type: "tuple",
                components: [
                    { name: "zeroForOne", type: "bool" },
                    { name: "amountSpecified", type: "int256" },
                    { name: "sqrtPriceLimitX96", type: "uint160" },
                ],
            },
            {
                name: "testSettings", type: "tuple",
                components: [
                    { name: "takeClaims", type: "bool" },
                    { name: "settleUsingBurn", type: "bool" },
                ],
            },
            { name: "hookData", type: "bytes" },
        ],
        name: "swap",
        outputs: [{ name: "delta", type: "int256" }],
        stateMutability: "payable",
        type: "function",
    },
] as const;

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIG = keccak256(toHex("Transfer(address,address,uint256)"));

function getPoolKey(fromSymbol: string, toSymbol: string) {
    const a = TOKEN_CONFIG[fromSymbol];
    const b = TOKEN_CONFIG[toSymbol];
    if (!a || !b) return null;

    const [currency0, currency1] =
        a.address.toLowerCase() < b.address.toLowerCase()
            ? [a.address, b.address]
            : [b.address, a.address];

    return {
        currency0,
        currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: SHADOW_ORDERS_HOOK,
    };
}

export async function POST(request: Request) {
    try {
        const { fromToken, toToken, amount, onChainOrderId, userAddress } = await request.json();

        console.log("[execute-order] Request:", { fromToken, toToken, amount, onChainOrderId, userAddress });

        if (!fromToken || !toToken || !userAddress) {
            return NextResponse.json({ error: "Missing fromToken, toToken, or userAddress" }, { status: 400 });
        }

        const inputToken = TOKEN_CONFIG[fromToken];
        const outputTokenConfig = TOKEN_CONFIG[toToken];
        if (!inputToken) {
            return NextResponse.json({ error: `Unknown fromToken: ${fromToken}` }, { status: 400 });
        }

        // Get keeper private key
        let keeperKey = process.env.KEEPER_PRIVATE_KEY;
        if (!keeperKey) {
            try {
                const envPath = path.join(process.cwd(), "..", ".env");
                const envContent = fs.readFileSync(envPath, "utf-8");
                const match = envContent.match(/KEEPER_PRIVATE_KEY=(.+)/);
                if (match && match[1].startsWith("0x")) {
                    keeperKey = match[1].trim();
                }
            } catch {
                // ignore
            }
        }

        if (!keeperKey) {
            return NextResponse.json({ error: "KEEPER_PRIVATE_KEY not configured" }, { status: 500 });
        }

        const account = privateKeyToAccount(keeperKey as `0x${string}`);
        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http("https://sepolia.base.org"),
        });
        const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http("https://sepolia.base.org"),
        });

        console.log("[execute-order] Keeper:", account.address);
        console.log("[execute-order] User:", userAddress);

        // Find pool key
        let poolKey = getPoolKey(fromToken, toToken);
        let outputSymbol = toToken;

        // If no direct pool, try routing through mWETH
        if (!poolKey && fromToken !== "mWETH" && toToken !== "mWETH") {
            poolKey = getPoolKey(fromToken, "mWETH");
            outputSymbol = "mWETH";
            console.log("[execute-order] Multi-hop: first leg", fromToken, "→ mWETH");
        }

        if (!poolKey) {
            return NextResponse.json({ error: `No pool for ${fromToken} → ${toToken}` }, { status: 400 });
        }

        const inputAmount = amount ? parseUnits(amount, inputToken.decimals) : parseUnits("100", inputToken.decimals);
        const outputToken = TOKEN_CONFIG[outputSymbol];

        if (!outputToken) {
            return NextResponse.json({ error: `Unknown output token: ${outputSymbol}` }, { status: 400 });
        }

        // Step 1: Execute order on-chain (if orderId provided)
        let executeOrderTxHash = null;
        if (onChainOrderId != null && onChainOrderId >= 0) {
            console.log("[execute-order] Step 1: executeOrder #" + onChainOrderId);
            const currentPrice = parseUnits("1", 18); // Simplified
            try {
                const hash = await walletClient.writeContract({
                    address: SHADOW_ORDERS_HOOK as `0x${string}`,
                    abi: HOOK_ABI,
                    functionName: "executeOrder",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    args: [BigInt(onChainOrderId), poolKey as any, currentPrice],
                    gas: BigInt(800000),
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                console.log("[execute-order] executeOrder confirmed! Gas:", receipt.gasUsed.toString());
                executeOrderTxHash = hash;
            } catch (err: unknown) {
                const msg = (err as Error)?.message || "";
                console.log("[execute-order] executeOrder failed (continuing):", msg.slice(0, 200));
            }
        } else {
            console.log("[execute-order] No orderId, skipping executeOrder");
        }

        // Step 2: Pull input tokens from user
        console.log("[execute-order] Step 2: Pulling", formatUnits(inputAmount, inputToken.decimals), fromToken, "from user");
        const pullHash = await walletClient.writeContract({
            address: inputToken.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "transferFrom",
            args: [userAddress as `0x${string}`, account.address, inputAmount],
            gas: BigInt(100000),
        });
        const pullReceipt = await publicClient.waitForTransactionReceipt({ hash: pullHash });
        console.log("[execute-order] Pulled user tokens! TX:", pullHash, "Gas:", pullReceipt.gasUsed.toString());

        // Step 3: Approve PoolSwapTest to spend input tokens
        console.log("[execute-order] Step 3: Approving PoolSwapTest to spend input tokens");
        const approveHash = await walletClient.writeContract({
            address: inputToken.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [POOL_SWAP_TEST as `0x${string}`, inputAmount * BigInt(2)],
            gas: BigInt(60000),
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log("[execute-order] Approved PoolSwapTest");

        // Step 4: Execute swap through pool
        console.log("[execute-order] Step 4: Swapping through pool");

        const inputAddr = inputToken.address.toLowerCase();
        const outputAddr = outputToken.address.toLowerCase();
        const zeroForOne = inputAddr < outputAddr;

        const swapHash = await walletClient.writeContract({
            address: POOL_SWAP_TEST as `0x${string}`,
            abi: POOL_SWAP_TEST_ABI,
            functionName: "swap",
            args: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                poolKey as any,
                {
                    zeroForOne,
                    amountSpecified: -inputAmount, // Exact input (negative = exact input)
                    sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT,
                },
                { takeClaims: false, settleUsingBurn: false },
                "0x" as `0x${string}`,
            ],
            gas: BigInt(1000000),
        });

        console.log("[execute-order] Swap TX:", swapHash);
        const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
        console.log("[execute-order] Swap confirmed! Gas:", swapReceipt.gasUsed.toString());

        // Step 5: Parse output amount from Transfer event logs (not balanceOf, which can be cached)
        console.log("[execute-order] Step 5: Parsing swap output from Transfer logs");

        let outputGained = BigInt(0);
        const keeperAddrLower = account.address.toLowerCase().slice(2).padStart(64, "0");

        for (const log of swapReceipt.logs) {
            // Match Transfer events TO the keeper address for the output token
            if (
                log.topics[0] === TRANSFER_EVENT_SIG &&
                log.address.toLowerCase() === outputToken.address.toLowerCase() &&
                log.topics[2]?.toLowerCase() === `0x${keeperAddrLower}`
            ) {
                const amount = BigInt(log.data);
                outputGained += amount;
                console.log(`[execute-order] Found Transfer: ${formatUnits(amount, outputToken.decimals)} ${outputSymbol} → keeper`);
            }
        }

        console.log(`[execute-order] Total output gained: ${formatUnits(outputGained, outputToken.decimals)} ${outputSymbol}`);

        if (outputGained === BigInt(0)) {
            console.log("[execute-order] WARNING: No output detected from swap logs!");
        }

        // Step 6: Transfer output tokens to user
        let transferHash: `0x${string}` = "0x0";
        if (outputGained > BigInt(0)) {
            console.log("[execute-order] Step 6: Transferring", formatUnits(outputGained, outputToken.decimals), outputSymbol, "to user");
            transferHash = await walletClient.writeContract({
                address: outputToken.address as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "transfer",
                args: [userAddress as `0x${string}`, outputGained],
                gas: BigInt(100000),
            });
            const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
            console.log("[execute-order] Transfer confirmed! TX:", transferHash, "Gas:", transferReceipt.gasUsed.toString());
        } else {
            console.log("[execute-order] Skipping transfer — no output to send");
        }

        console.log("[execute-order] ✅ Complete!");

        return NextResponse.json({
            success: true,
            pullTxHash: pullHash,
            swapTxHash: swapHash,
            transferTxHash: transferHash,
            executeOrderTxHash,
            outputAmount: formatUnits(outputGained, outputToken.decimals),
            outputToken: outputSymbol,
            inputAmount: formatUnits(inputAmount, inputToken.decimals),
            inputToken: fromToken,
        });
    } catch (error: unknown) {
        const err = error as Error & { shortMessage?: string };
        console.error("[execute-order] Error:", err?.message || error);
        return NextResponse.json(
            { error: err?.message || "Execution failed", details: err?.shortMessage },
            { status: 500 }
        );
    }
}
