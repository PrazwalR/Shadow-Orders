"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface TrackedOrder {
    orderId: string;
    txHash: string;
    fromToken: string;
    toToken: string;
    amount: string;
    limitPrice: number;
    startPrice: number;
    currentSimulatedPrice: number;
    status: "pending" | "executing" | "executed" | "failed";
    createdAt: number;
    executedAt?: number;
    executionTxHash?: string;
    tickCount: number;
}

interface OrderTrackingContextType {
    orders: TrackedOrder[];
    addOrder: (order: Omit<TrackedOrder, "currentSimulatedPrice" | "status" | "createdAt" | "tickCount">) => void;
    clearOrders: () => void;
    markOrderExecuted: (orderId: string, executionTxHash: string) => void;
    markOrderFailed: (orderId: string) => void;
}

const OrderTrackingContext = createContext<OrderTrackingContextType | undefined>(undefined);

// Simulation speed - price updates every 2 seconds
const SIMULATION_INTERVAL = 2000;
// Price movement per tick - 12% closer to target each tick
const PRICE_MOVE_RATE = 0.12;
// After this many ticks, force execution (prevents infinite asymptotic approach)
const MAX_TICKS_BEFORE_EXECUTE = 15;

const STORAGE_KEY = "shadow-orders-tracked";

export function OrderTrackingProvider({ children }: { children: ReactNode }) {
    const [orders, setOrdersState] = useState<TrackedOrder[]>([]);

    // Load from localStorage after hydration
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setOrdersState(JSON.parse(saved));
            } catch {
                // corrupted data
            }
        }
    }, []);

    // Wrapper to persist orders
    const setOrders = useCallback((updater: TrackedOrder[] | ((prev: TrackedOrder[]) => TrackedOrder[])) => {
        setOrdersState(prev => {
            const newOrders = typeof updater === "function" ? updater(prev) : updater;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders));
            return newOrders;
        });
    }, []);

    // Price simulation — moves currentSimulatedPrice toward limitPrice
    // When it reaches the limit, transitions to "executing" so SwapExecutor fires the real swap
    useEffect(() => {
        const interval = setInterval(() => {
            setOrdersState(prevOrders => {
                const hasPending = prevOrders.some(o => o.status === "pending");
                if (!hasPending) return prevOrders;

                const updated = prevOrders.map(order => {
                    if (order.status !== "pending") return order;

                    const tickCount = order.tickCount + 1;
                    const direction = order.startPrice > order.limitPrice ? -1 : 1;
                    const distance = Math.abs(order.currentSimulatedPrice - order.limitPrice);
                    const step = distance * PRICE_MOVE_RATE;

                    let newPrice = order.currentSimulatedPrice + step * direction;

                    // Add noise for realism
                    const noise = (Math.random() - 0.5) * step * 0.2;
                    newPrice += noise;

                    // Clamp to not overshoot
                    if (direction === -1) {
                        newPrice = Math.max(newPrice, order.limitPrice);
                    } else {
                        newPrice = Math.min(newPrice, order.limitPrice);
                    }

                    // Check if limit reached
                    const threshold = Math.abs(order.limitPrice) * 0.005;
                    const withinThreshold = Math.abs(newPrice - order.limitPrice) <= threshold;
                    const forcedByTicks = tickCount >= MAX_TICKS_BEFORE_EXECUTE;

                    if (withinThreshold || forcedByTicks) {
                        console.log(`🎯 Order ${order.orderId.slice(0, 12)}... limit reached after ${tickCount} ticks`);
                        return {
                            ...order,
                            currentSimulatedPrice: order.limitPrice,
                            status: "executing" as const,
                            tickCount,
                        };
                    }

                    return { ...order, currentSimulatedPrice: newPrice, tickCount };
                });

                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        }, SIMULATION_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    const addOrder = useCallback((order: Omit<TrackedOrder, "currentSimulatedPrice" | "status" | "createdAt" | "tickCount">) => {
        const newOrder: TrackedOrder = {
            ...order,
            currentSimulatedPrice: order.startPrice,
            status: "pending",
            createdAt: Date.now(),
            tickCount: 0,
        };
        setOrders(prev => [...prev, newOrder]);
    }, [setOrders]);

    const clearOrders = useCallback(() => {
        setOrders([]);
        localStorage.removeItem(STORAGE_KEY);
    }, [setOrders]);

    const markOrderExecuted = useCallback((orderId: string, executionTxHash: string) => {
        console.log(`✅ Order executed: ${orderId.slice(0, 12)}...`);
        setOrders(prev =>
            prev.map(o =>
                o.orderId === orderId
                    ? { ...o, status: "executed" as const, executedAt: Date.now(), executionTxHash }
                    : o
            )
        );
    }, [setOrders]);

    const markOrderFailed = useCallback((orderId: string) => {
        console.log(`❌ Order swap failed: ${orderId.slice(0, 12)}... — reverting to pending`);
        setOrders(prev =>
            prev.map(o =>
                o.orderId === orderId
                    ? { ...o, status: "pending" as const, tickCount: Math.max(0, o.tickCount - 3) }
                    : o
            )
        );
    }, [setOrders]);

    return (
        <OrderTrackingContext.Provider value={{ orders, addOrder, clearOrders, markOrderExecuted, markOrderFailed }}>
            {children}
        </OrderTrackingContext.Provider>
    );
}

export function useOrderTracking() {
    const context = useContext(OrderTrackingContext);
    if (!context) {
        throw new Error("useOrderTracking must be used within an OrderTrackingProvider");
    }
    return context;
}
