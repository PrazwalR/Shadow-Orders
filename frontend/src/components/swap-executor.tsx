"use client";

import { useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useOrderTracking } from "@/contexts/order-tracking-context";

/**
 * SwapExecutor — Triggers REAL on-chain execution when price simulation reaches limit.
 *
 * Flow:
 *   1. Price simulation moves toward limit → order reaches "executing" status
 *   2. SwapExecutor detects the "executing" order
 *   3. Calls /api/execute-order (server-side) which uses the KEEPER wallet to:
 *      a. transferFrom(user → keeper) — pull user's input tokens
 *      b. PoolSwapTest.swap() → PoolManager.swap() → Hook callbacks
 *      c. transfer(keeper → user) — send output tokens to user
 *   4. Returns real TX hashes → order marked "executed" with real BaseScan link
 */
export function SwapExecutor() {
    const { isConnected, address } = useAccount();
    const { orders, markOrderExecuted, markOrderFailed } = useOrderTracking();

    // Track which orders we're already processing to prevent duplicate calls
    const processingRef = useRef<Set<string>>(new Set());

    // Watch for orders in "executing" status and call the keeper API
    useEffect(() => {
        if (!isConnected) return;

        const executingOrder = orders.find(
            (o) => o.status === "executing" && !processingRef.current.has(o.orderId)
        );

        if (!executingOrder) return;

        // Mark as processing immediately to prevent duplicates
        processingRef.current.add(executingOrder.orderId);

        console.log(`🔄 SwapExecutor: Limit reached for order ${executingOrder.orderId.slice(0, 12)}...`);
        console.log(`   Calling keeper to execute: ${executingOrder.fromToken} → ${executingOrder.toToken}`);
        console.log(`   Amount: ${executingOrder.amount} ${executingOrder.fromToken}`);

        // Call the server-side API that uses the keeper wallet
        const executeViaKeeper = async () => {
            try {
                console.log("📡 SwapExecutor: Calling /api/execute-order...");

                const response = await fetch("/api/execute-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fromToken: executingOrder.fromToken,
                        toToken: executingOrder.toToken,
                        amount: executingOrder.amount,
                        userAddress: address,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `API returned ${response.status}`);
                }

                console.log("✅ SwapExecutor: Keeper executed order successfully!");
                console.log(`   Swap TX: ${data.swapTxHash}`);
                console.log(`   View swap: https://sepolia.basescan.org/tx/${data.swapTxHash}`);

                // Mark order as executed with the REAL swap TX hash
                markOrderExecuted(executingOrder.orderId, data.swapTxHash);
            } catch (err) {
                console.error("❌ SwapExecutor: Keeper execution failed:", err);
                processingRef.current.delete(executingOrder.orderId);
                markOrderFailed(executingOrder.orderId);
            }
        };

        executeViaKeeper();
    }, [orders, isConnected, markOrderExecuted, markOrderFailed, address]);

    // This component renders nothing — it's a pure side-effect component
    return null;
}
