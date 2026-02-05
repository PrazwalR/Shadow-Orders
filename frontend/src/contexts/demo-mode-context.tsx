"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";

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
}

interface DemoModeContextType {
    isDemoMode: boolean;
    setIsDemoMode: (value: boolean) => void;
    orders: OrderSimulation[];
    addOrder: (order: Omit<OrderSimulation, "currentSimulatedPrice" | "status" | "createdAt">) => void;
    clearOrders: () => void;
    simulatedPrices: { [key: string]: number };
    getSimulatedPrice: (fromToken: string, toToken: string) => number | null;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

// Simulation speed - price updates every 2 seconds
const SIMULATION_INTERVAL = 2000;
// Price drop per interval (percentage of distance to target)
const PRICE_DROP_RATE = 0.08; // 8% closer to target each tick

export function DemoModeProvider({ children }: { children: ReactNode }) {
    const [isDemoMode, setIsDemoModeState] = useState(true);
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

    // Price simulation effect - runs when in demo mode
    useEffect(() => {
        if (!isDemoMode) {
            console.log("DemoMode: Simulation disabled (not in demo mode)");
            return;
        }

        console.log("DemoMode: Starting price simulation interval");

        const interval = setInterval(() => {
            setOrdersState(prevOrders => {
                const pendingOrders = prevOrders.filter(o => o.status === "pending");
                if (pendingOrders.length === 0) {
                    return prevOrders;
                }

                console.log("DemoMode: Simulating price for", pendingOrders.length, "pending orders");

                const newOrders = prevOrders.map(order => {
                    if (order.status !== "pending") return order;

                    // Calculate new simulated price (moving toward limit price)
                    const direction = order.startPrice > order.limitPrice ? -1 : 1;
                    const distance = Math.abs(order.currentSimulatedPrice - order.limitPrice);
                    const step = distance * PRICE_DROP_RATE;

                    let newPrice = order.currentSimulatedPrice + (step * direction);

                    // Add some noise for realism
                    const noise = (Math.random() - 0.5) * step * 0.3;
                    newPrice += noise;

                    console.log(`DemoMode: Order ${order.orderId.slice(0, 15)}... price: ${order.currentSimulatedPrice.toFixed(8)} → ${newPrice.toFixed(8)} (target: ${order.limitPrice})`);

                    // Check if we've reached the limit price
                    const reachedTarget = direction === -1
                        ? newPrice <= order.limitPrice
                        : newPrice >= order.limitPrice;

                    if (reachedTarget) {
                        // Order should execute!
                        console.log("🎯 DemoMode: Order reached target! Transitioning to executing...");
                        return {
                            ...order,
                            currentSimulatedPrice: order.limitPrice,
                            status: "executing" as const,
                        };
                    }

                    return {
                        ...order,
                        currentSimulatedPrice: newPrice,
                    };
                });

                // Save to localStorage on every update so UI shows latest prices
                localStorage.setItem("shadow-orders-pending", JSON.stringify(newOrders));

                return newOrders;
            });
        }, SIMULATION_INTERVAL);

        return () => {
            console.log("DemoMode: Clearing simulation interval");
            clearInterval(interval);
        };
    }, [isDemoMode]);

    // Track which orders are already being executed to prevent duplicate timeouts
    const executingTimeoutsRef = useRef<Set<string>>(new Set());

    // Handle executing → executed transition (simulated keeper execution)
    useEffect(() => {
        const executingOrders = orders.filter(o => o.status === "executing");

        executingOrders.forEach(order => {
            // Skip if we already started execution for this order
            if (executingTimeoutsRef.current.has(order.orderId)) {
                return;
            }
            
            // Mark this order as being executed
            executingTimeoutsRef.current.add(order.orderId);
            console.log("🔄 DemoMode: Starting execution for order", order.orderId.slice(0, 15));

            // Simulate keeper execution delay (2-3 seconds)
            const delay = 2000 + Math.random() * 1000;
            console.log(`⏳ DemoMode: Order ${order.orderId.slice(0, 15)}... will execute in ${(delay/1000).toFixed(1)}s`);

            setTimeout(() => {
                console.log(`✅ DemoMode: Executing order ${order.orderId.slice(0, 15)}...`);
                setOrders(prev => prev.map(o => {
                    if (o.orderId === order.orderId && o.status === "executing") {
                        const executedOrder = {
                            ...o,
                            status: "executed" as const,
                            executedAt: Date.now(),
                            // Simulated execution tx hash
                            executionTxHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 66),
                        };
                        console.log("🎉 DemoMode: Order executed!", executedOrder);
                        return executedOrder;
                    }
                    return o;
                }));
                // Clean up the tracking
                executingTimeoutsRef.current.delete(order.orderId);
            }, delay);
        });
    }, [orders, setOrders]);

    const addOrder = useCallback((order: Omit<OrderSimulation, "currentSimulatedPrice" | "status" | "createdAt">) => {
        console.log("DemoModeContext: Adding order", order);
        const newOrder: OrderSimulation = {
            ...order,
            currentSimulatedPrice: order.startPrice,
            status: "pending",
            createdAt: Date.now(),
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
