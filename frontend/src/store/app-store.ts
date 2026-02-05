import { create } from "zustand";
import { POOLS } from "@/config/contracts";

interface TokenBalance {
    address: string;
    symbol: string;
    balance: bigint;
    decimals: number;
}

interface Order {
    id: number;
    poolId: string;
    owner: string;
    isBuy: boolean;
    isActive: boolean;
    createdAt: number;
    // Note: price and amount are encrypted, stored as handles
    encryptedLimitPrice: bigint;
    encryptedAmount: bigint;
}

interface MarketData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    sparkline_in_7d?: { price: number[] };
    image: string;
}

interface AppState {
    // UI State
    selectedPool: typeof POOLS[number] | null;
    isCreateOrderOpen: boolean;
    isMintTokensOpen: boolean;

    // Wallet State
    isConnected: boolean;
    address: string | null;
    chainId: number | null;

    // Token Balances
    balances: Record<string, TokenBalance>;

    // Orders
    userOrders: Order[];
    activeOrders: Order[];

    // Market Data
    marketData: MarketData[];
    isLoadingMarket: boolean;

    // Actions
    setSelectedPool: (pool: typeof POOLS[number] | null) => void;
    setIsCreateOrderOpen: (open: boolean) => void;
    setIsMintTokensOpen: (open: boolean) => void;
    setWalletState: (isConnected: boolean, address: string | null, chainId: number | null) => void;
    setBalances: (balances: Record<string, TokenBalance>) => void;
    updateBalance: (address: string, balance: TokenBalance) => void;
    setUserOrders: (orders: Order[]) => void;
    setActiveOrders: (orders: Order[]) => void;
    setMarketData: (data: MarketData[]) => void;
    setIsLoadingMarket: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Initial UI State
    selectedPool: POOLS[0],
    isCreateOrderOpen: false,
    isMintTokensOpen: false,

    // Initial Wallet State
    isConnected: false,
    address: null,
    chainId: null,

    // Initial Token Balances
    balances: {},

    // Initial Orders
    userOrders: [],
    activeOrders: [],

    // Initial Market Data
    marketData: [],
    isLoadingMarket: false,

    // Actions
    setSelectedPool: (pool) => set({ selectedPool: pool }),
    setIsCreateOrderOpen: (open) => set({ isCreateOrderOpen: open }),
    setIsMintTokensOpen: (open) => set({ isMintTokensOpen: open }),

    setWalletState: (isConnected, address, chainId) =>
        set({ isConnected, address, chainId }),

    setBalances: (balances) => set({ balances }),

    updateBalance: (address, balance) =>
        set((state) => ({
            balances: { ...state.balances, [address]: balance },
        })),

    setUserOrders: (orders) => set({ userOrders: orders }),
    setActiveOrders: (orders) => set({ activeOrders: orders }),

    setMarketData: (data) => set({ marketData: data }),
    setIsLoadingMarket: (loading) => set({ isLoadingMarket: loading }),
}));
