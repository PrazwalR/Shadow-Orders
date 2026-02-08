"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface OrderSimulation {
    orderId: string;
    txHash: string;
    fromToken: string;
    toToken: string;
    amount: string;
    limitPrice: number;
    startPrice: number;
    currentSimulatedPrice: number;
    status: "pending" | "executing" | "executed" | "cancelled";
    createdAt: number;
    executedAt?: number;
    executionTxHash?: string;
    onChainOrderId?: number | null;
    tickCount?: number;
}

interface DemoModeContextType {
    isDemoMode: boolean;
    setIsDemoMode: (value: boolean) => void;
    orders: OrderSimulation[];
    addOrder: (order: Omit<OrderSimulation, "currentSimulatedPrice" | "status" | "createdAt" | "tickCount">) => void;
    clearOrders: () => void;
    simulatedPrices: { [key: string]: number };
    getSimulatedPrice: (fromToken: string, toToken: string) => number | null;
    markOrderExecuted: (orderId: string, executionTxHash: string) => void;
    markOrderSwapFailed: (orderId: string) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

// Simulation speed - price updates every 2 seconds
const SIMULATION_INTERVAL = 2000;
// Price movement per tick - 12% closer to target each tick
const PRICE_DROP_RATE = 0.12;
// After this many ticks, force execution (prevents infinite asymptotic approach)
const MAX_TICKS_BEFORE_EXECUTE = 15;

export function DemoModeProvider({ children }: { children: ReactNode }) {
    const [isDemoMode, setIsDemoModeState] = useState(false);
    const [orders, setOrdersState] = useState<OrderSimulation[]>([]);
    const [simulatedPrices, setSimulatedPrices] = useState<{ [key: string]: number }>({});

    // Load state from localStorage after hydration
    useEffect(() => {
        const saved = localStorage.getItem("shadow-orders-demo-mode");
        if (saved !== null) {
            setIsDemoModeState(JSON.parse(saved));
        }

        const savedOrders = localStorage.getItem("shadow-orders-pending");
        console.log("DemoModeContext: Loading from localStorage:", savedOrders);
        if (savedOrders) {
            try {
                const parsed = JSON.parse(savedOrders);
                console.log("DemoModeContext: Parsed orders:", parsed);
                setOrdersState(parsed);
            } catch (e) {
                console.error("Failed to parse saved orders", e);
            }
        }
    }, []);

    // Wrapper to save demo mode preference immediately
    const setIsDemoMode = useCallback((value: boolean) => {
        setIsDemoModeState(value);
        localStorage.setItem("shadow-orders-demo-mode", JSON.stringify(value));
    }, []);

    // Wrapper to save orders immediately when adding
    const setOrders = useCallback((updater: OrderSimulation[] | ((prev: OrderSimulation[]) => OrderSimulation[])) => {
        setOrdersState(prev => {
            const newOrders = typeof updater === 'function' ? updater(prev) : updater;
            console.log("DemoModeContext: Saving orders to localStorage:", newOrders);
            localStorage.setItem("shadow-orders-pending", JSON.stringify(newOrders));
            return newOrders;
        });
    }, []);

    // Unified price simulation effect
    // IMPORTANT: This ONLY simulates price movement and transitions to "executing".
    // It does NOT generate fake TX hashes or auto-transition to "executed".
    // The SwapExecutor component handles the REAL on-chain swap when status = "executing".
    useEffect(() => {
        if (!isDemoMode) {
            console.log("DemoMode: Simulation disabled (not in demo mode)");
            return;
        }

        console.log("DemoMode: Starting unified simulation interval");

        const interval = setInterval(() => {
            setOrdersState(prevOrders => {
                const pendingOrders = prevOrders.filter(o => o.status === "pending");
                if (pendingOrders.length === 0) {
                    return prevOrders;
                }

                const newOrders = prevOrders.map(order => {
                    // Handle PENDING orders - simulate price movement
                    if (order.status === "pending") {
                        const tickCount = (order.tickCount || 0) + 1;
                        const direction = order.startPrice > order.limitPrice ? -1 : 1;
                        const distance = Math.abs(order.currentSimulatedPrice - order.limitPrice);
                        const step = distance * PRICE_DROP_RATE;

                        let newPrice = order.currentSimulatedPrice + (step * direction);

                        // Add some noise for realism
                        const noise = (Math.random() - 0.5) * step * 0.2;
                        newPrice += noise;

                        // Clamp to not overshoot the target
                        if (direction === -1) {
                            newPrice = Math.max(newPrice, order.limitPrice);
                        } else {
                            newPrice = Math.min(newPrice, order.limitPrice);
                        }

                        // Check if we've reached the limit price:
                        // 1. Within 0.5% threshold of target, OR
                        // 2. Exceeded max ticks (force execution to avoid infinite approach)
                        const threshold = Math.abs(order.limitPrice) * 0.005; // 0.5% threshold
                        const withinThreshold = Math.abs(newPrice - order.limitPrice) <= threshold;
                        const forcedByTicks = tickCount >= MAX_TICKS_BEFORE_EXECUTE;
                        const reachedTarget = withinThreshold || forcedByTicks;

                        if (reachedTarget) {
                            console.log(`🎯 Order ${order.orderId.slice(0, 12)}... reached target after ${tickCount} ticks! ${forcedByTicks ? "(forced)" : "(threshold)"}`);
                            // Transition to "executing" — the SwapExecutor component
                            // will detect this and fire the REAL on-chain swap.
                            return {
                                ...order,
                                currentSimulatedPrice: order.limitPrice,
                                status: "executing" as const,
                                tickCount,
                            };
                        }

                        return {
                            ...order,
                            currentSimulatedPrice: newPrice,
                            tickCount,
                        };
                    }

                    // "executing" orders are handled by SwapExecutor — don't touch them here
                    return order;
                });

                // Save to localStorage
                localStorage.setItem("shadow-orders-pending", JSON.stringify(newOrders));

                return newOrders;
            });
        }, SIMULATION_INTERVAL);

        return () => {
            console.log("DemoMode: Clearing simulation interval");
            clearInterval(interval);
        };
    }, [isDemoMode]);

    const addOrder = useCallback((order: Omit<OrderSimulation, "currentSimulatedPrice" | "status" | "createdAt" | "tickCount">) => {
        console.log("DemoModeContext: Adding order", order);
        const newOrder: OrderSimulation = {
            ...order,
            currentSimulatedPrice: order.startPrice,
            status: "pending",
            createdAt: Date.now(),
            tickCount: 0,
        };
        setOrders(prev => {
            console.log("DemoModeContext: Previous orders count:", prev.length);
            const updated = [...prev, newOrder];
            console.log("DemoModeContext: New orders count:", updated.length);
            return updated;
        });
    }, [setOrders]);

    const clearOrders = useCallback(() => {
        setOrders([]);
        localStorage.removeItem("shadow-orders-pending");
    }, [setOrders]);

    const getSimulatedPrice = useCallback((fromToken: string, toToken: string): number | null => {
        const key = `${fromToken}-${toToken}`;
        return simulatedPrices[key] || null;
    }, [simulatedPrices]);

    // Called by SwapExecutor when the REAL on-chain swap succeeds
    const markOrderExecuted = useCallback((orderId: string, txHash: string) => {
        console.log(`✅ DemoMode: markOrderExecuted orderId=${orderId.slice(0, 12)}... txHash=${txHash.slice(0, 12)}...`);
        setOrders(prev => {
            const updated = prev.map(o => {
                if (o.orderId === orderId) {
                    return {
                        ...o,
                        status: "executed" as const,
                        executedAt: Date.now(),
                        executionTxHash: txHash,
                    };
                }
                return o;
            });
            localStorage.setItem("shadow-orders-pending", JSON.stringify(updated));
            return updated;
        });
    }, [setOrders]);

    // Called by SwapExecutor when the REAL on-chain swap fails
    const markOrderSwapFailed = useCallback((orderId: string) => {
        console.log(`❌ DemoMode: markOrderSwapFailed orderId=${orderId.slice(0, 12)}... — reverting to pending`);
        setOrders(prev => {
            const updated = prev.map(o => {
                if (o.orderId === orderId) {
                    return {
                        ...o,
                        status: "pending" as const,
                        tickCount: Math.max(0, (o.tickCount || 0) - 3),
                    };
                }
                return o;
            });
            localStorage.setItem("shadow-orders-pending", JSON.stringify(updated));
            return updated;
        });
    }, [setOrders]);

    return (
        <DemoModeContext.Provider
            value={{
                isDemoMode,
                setIsDemoMode,
                orders,
                addOrder,
                clearOrders,
                simulatedPrices,
                getSimulatedPrice,
                markOrderExecuted,
                markOrderSwapFailed,
            }}
        >
            {children}
        </DemoModeContext.Provider>
    );
}

export function useDemoMode() {
    const context = useContext(DemoModeContext);
    if (context === undefined) {
        throw new Error("useDemoMode must be used within a DemoModeProvider");
    }
    return context;
}
