"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app-store";

const COINGECKO_IDS = [
    "bitcoin",
    "ethereum",
    "usd-coin",
    "dai",
    "chainlink",
    "wrapped-bitcoin",
    "uniswap",
    "aave",
    "compound-governance-token",
    "maker",
];

interface CoinGeckoResponse {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    price_change_percentage_24h: number;
    sparkline_in_7d?: {
        price: number[];
    };
}

export function useMarketData() {
    const { marketData, isLoadingMarket, setMarketData, setIsLoadingMarket } = useAppStore();

    const fetchMarketData = useCallback(async () => {
        setIsLoadingMarket(true);
        try {
            const ids = COINGECKO_IDS.join(",");
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch market data");
            }

            const data: CoinGeckoResponse[] = await response.json();
            setMarketData(
                data.map((coin) => ({
                    id: coin.id,
                    symbol: coin.symbol.toUpperCase(),
                    name: coin.name,
                    current_price: coin.current_price,
                    price_change_percentage_24h: coin.price_change_percentage_24h,
                    market_cap: coin.market_cap,
                    total_volume: coin.total_volume,
                    sparkline_in_7d: coin.sparkline_in_7d,
                    image: coin.image,
                }))
            );
        } catch (error) {
            console.error("Error fetching market data:", error);
            // Set mock data on error for demo
            setMarketData(getMockMarketData());
        } finally {
            setIsLoadingMarket(false);
        }
    }, [setMarketData, setIsLoadingMarket]);

    useEffect(() => {
        fetchMarketData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchMarketData, 30000);
        return () => clearInterval(interval);
    }, [fetchMarketData]);

    return {
        marketData,
        isLoading: isLoadingMarket,
        refetch: fetchMarketData,
    };
}

// Mock data for fallback
function getMockMarketData() {
    return [
        {
            id: "bitcoin",
            symbol: "BTC",
            name: "Bitcoin",
            current_price: 97500,
            price_change_percentage_24h: 2.34,
            market_cap: 1920000000000,
            total_volume: 45000000000,
            image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
            sparkline_in_7d: { price: generateSparkline(97500) },
        },
        {
            id: "ethereum",
            symbol: "ETH",
            name: "Ethereum",
            current_price: 3200,
            price_change_percentage_24h: 1.56,
            market_cap: 385000000000,
            total_volume: 18000000000,
            image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
            sparkline_in_7d: { price: generateSparkline(3200) },
        },
        {
            id: "usd-coin",
            symbol: "USDC",
            name: "USD Coin",
            current_price: 1.0,
            price_change_percentage_24h: 0.01,
            market_cap: 45000000000,
            total_volume: 8000000000,
            image: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
            sparkline_in_7d: { price: generateSparkline(1.0, 0.001) },
        },
        {
            id: "dai",
            symbol: "DAI",
            name: "Dai",
            current_price: 1.0,
            price_change_percentage_24h: -0.02,
            market_cap: 5300000000,
            total_volume: 280000000,
            image: "https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png",
            sparkline_in_7d: { price: generateSparkline(1.0, 0.001) },
        },
        {
            id: "chainlink",
            symbol: "LINK",
            name: "Chainlink",
            current_price: 18.5,
            price_change_percentage_24h: 3.21,
            market_cap: 11500000000,
            total_volume: 850000000,
            image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
            sparkline_in_7d: { price: generateSparkline(18.5) },
        },
        {
            id: "wrapped-bitcoin",
            symbol: "WBTC",
            name: "Wrapped Bitcoin",
            current_price: 97450,
            price_change_percentage_24h: 2.31,
            market_cap: 15500000000,
            total_volume: 420000000,
            image: "https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
            sparkline_in_7d: { price: generateSparkline(97450) },
        },
        {
            id: "uniswap",
            symbol: "UNI",
            name: "Uniswap",
            current_price: 9.2,
            price_change_percentage_24h: -1.45,
            market_cap: 5500000000,
            total_volume: 210000000,
            image: "https://assets.coingecko.com/coins/images/12504/large/uniswap.png",
            sparkline_in_7d: { price: generateSparkline(9.2) },
        },
        {
            id: "aave",
            symbol: "AAVE",
            name: "Aave",
            current_price: 295,
            price_change_percentage_24h: 4.12,
            market_cap: 4400000000,
            total_volume: 320000000,
            image: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
            sparkline_in_7d: { price: generateSparkline(295) },
        },
    ];
}

function generateSparkline(basePrice: number, volatility: number = 0.05): number[] {
    const points: number[] = [];
    let price = basePrice;
    for (let i = 0; i < 168; i++) {
        const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
        price = price + change;
        points.push(Math.max(0, price));
    }
    return points;
}
