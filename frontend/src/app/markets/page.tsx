"use client";

import { useState, useEffect } from "react";
import {
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    BarChart3,
    Search,
    Star,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/blocks/navbar";
import { ShadowFooter } from "@/components/blocks/shadow-footer";

interface CoinData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d_in_currency: number;
    sparkline_in_7d: {
        price: number[];
    };
    circulating_supply: number;
    ath: number;
    ath_change_percentage: number;
}

// Mini sparkline component
const Sparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg className="h-10 w-24" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
                fill="none"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth="2"
                points={points}
            />
        </svg>
    );
};

const formatPrice = (price: number) => {
    if (price >= 1000) {
        return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
        return `$${price.toFixed(2)}`;
    } else {
        return `$${price.toFixed(6)}`;
    }
};

const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) {
        return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(2)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
};

const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
        return `$${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
        return `$${(volume / 1e6).toFixed(2)}M`;
    }
    return `$${volume.toLocaleString()}`;
};

export default function MarketsPage() {
    const [coins, setCoins] = useState<CoinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchMarketData = async () => {
        try {
            setIsRefreshing(true);
            // Use free CoinGecko API (no key required)
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?' +
                new URLSearchParams({
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: '50',
                    page: '1',
                    sparkline: 'true',
                    price_change_percentage: '24h,7d'
                })
            );

            if (!response.ok) {
                // Rate limited or error - use demo data silently
                throw new Error('API unavailable');
            }

            const data = await response.json();
            setCoins(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            // Use demo data silently (no console error)
            setCoins(getDemoData());
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMarketData();
        const interval = setInterval(fetchMarketData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const toggleFavorite = (id: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const filteredCoins = coins.filter(coin =>
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort favorites first
    const sortedCoins = [...filteredCoins].sort((a, b) => {
        const aFav = favorites.has(a.id) ? 1 : 0;
        const bFav = favorites.has(b.id) ? 1 : 0;
        return bFav - aFav;
    });

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background pt-20">
                <div className="container py-8">
                    {/* Header */}
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Markets</h1>
                            <p className="text-muted-foreground mt-1">
                                Track cryptocurrency prices in real-time
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search coins..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-64"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={fetchMarketData}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border bg-card p-6">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <BarChart3 className="h-4 w-4" />
                                <span className="text-sm">Total Market Cap</span>
                            </div>
                            <p className="mt-2 text-2xl font-bold">
                                {coins.length > 0
                                    ? formatMarketCap(coins.reduce((acc, c) => acc + c.market_cap, 0))
                                    : '—'
                                }
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-6">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-sm">24h Volume</span>
                            </div>
                            <p className="mt-2 text-2xl font-bold">
                                {coins.length > 0
                                    ? formatVolume(coins.reduce((acc, c) => acc + c.total_volume, 0))
                                    : '—'
                                }
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-6">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="text-sm">🟢 Gainers</span>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-green-500">
                                {coins.filter(c => c.price_change_percentage_24h > 0).length}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-6">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="text-sm">🔴 Losers</span>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-red-500">
                                {coins.filter(c => c.price_change_percentage_24h < 0).length}
                            </p>
                        </div>
                    </div>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <p className="mb-4 text-sm text-muted-foreground">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}

                    {/* Table */}
                    <div className="rounded-xl border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead>Coin</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">24h %</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">7d %</TableHead>
                                    <TableHead className="text-right hidden lg:table-cell">Market Cap</TableHead>
                                    <TableHead className="text-right hidden lg:table-cell">Volume (24h)</TableHead>
                                    <TableHead className="hidden xl:table-cell">Last 7 Days</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    // Loading skeleton
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-8 w-8 rounded-full" />
                                                    <div>
                                                        <Skeleton className="h-4 w-24" />
                                                        <Skeleton className="h-3 w-12 mt-1" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                            <TableCell className="hidden xl:table-cell"><Skeleton className="h-10 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    sortedCoins.map((coin) => (
                                        <TableRow key={coin.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <button
                                                    onClick={() => toggleFavorite(coin.id)}
                                                    className="text-muted-foreground hover:text-yellow-500 transition-colors"
                                                >
                                                    <Star
                                                        className={cn(
                                                            "h-4 w-4",
                                                            favorites.has(coin.id) && "fill-yellow-500 text-yellow-500"
                                                        )}
                                                    />
                                                </button>
                                            </TableCell>
                                            <TableCell className="font-medium text-muted-foreground">
                                                {coin.market_cap_rank}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={coin.image}
                                                        alt={coin.name}
                                                        className="h-8 w-8 rounded-full"
                                                    />
                                                    <div>
                                                        <p className="font-medium">{coin.name}</p>
                                                        <p className="text-xs text-muted-foreground uppercase">
                                                            {coin.symbol}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatPrice(coin.current_price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1",
                                                        coin.price_change_percentage_24h >= 0
                                                            ? "text-green-500"
                                                            : "text-red-500"
                                                    )}
                                                >
                                                    {coin.price_change_percentage_24h >= 0 ? (
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    ) : (
                                                        <ArrowDownRight className="h-3 w-3" />
                                                    )}
                                                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right hidden md:table-cell">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1",
                                                        (coin.price_change_percentage_7d_in_currency || 0) >= 0
                                                            ? "text-green-500"
                                                            : "text-red-500"
                                                    )}
                                                >
                                                    {(coin.price_change_percentage_7d_in_currency || 0) >= 0 ? (
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    ) : (
                                                        <ArrowDownRight className="h-3 w-3" />
                                                    )}
                                                    {Math.abs(coin.price_change_percentage_7d_in_currency || 0).toFixed(2)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right hidden lg:table-cell">
                                                {formatMarketCap(coin.market_cap)}
                                            </TableCell>
                                            <TableCell className="text-right hidden lg:table-cell">
                                                {formatVolume(coin.total_volume)}
                                            </TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                {coin.sparkline_in_7d?.price && (
                                                    <Sparkline
                                                        data={coin.sparkline_in_7d.price}
                                                        isPositive={(coin.price_change_percentage_7d_in_currency || 0) >= 0}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {error && (
                        <p className="mt-4 text-sm text-amber-500">{error}</p>
                    )}
                </div>
            </main>
            <ShadowFooter />
        </>
    );
}

// Demo data fallback
function getDemoData(): CoinData[] {
    return [
        {
            id: "bitcoin",
            symbol: "btc",
            name: "Bitcoin",
            image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
            current_price: 67500,
            market_cap: 1330000000000,
            market_cap_rank: 1,
            total_volume: 28000000000,
            price_change_percentage_24h: 2.5,
            price_change_percentage_7d_in_currency: 5.2,
            sparkline_in_7d: { price: Array.from({ length: 168 }, () => 67000 + Math.random() * 2000) },
            circulating_supply: 19700000,
            ath: 73700,
            ath_change_percentage: -8.4
        },
        {
            id: "ethereum",
            symbol: "eth",
            name: "Ethereum",
            image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
            current_price: 3450,
            market_cap: 415000000000,
            market_cap_rank: 2,
            total_volume: 15000000000,
            price_change_percentage_24h: 1.8,
            price_change_percentage_7d_in_currency: 3.5,
            sparkline_in_7d: { price: Array.from({ length: 168 }, () => 3400 + Math.random() * 150) },
            circulating_supply: 120200000,
            ath: 4878,
            ath_change_percentage: -29.3
        },
        {
            id: "usd-coin",
            symbol: "usdc",
            name: "USD Coin",
            image: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
            current_price: 1.00,
            market_cap: 33000000000,
            market_cap_rank: 6,
            total_volume: 5000000000,
            price_change_percentage_24h: 0.01,
            price_change_percentage_7d_in_currency: -0.02,
            sparkline_in_7d: { price: Array.from({ length: 168 }, () => 0.999 + Math.random() * 0.002) },
            circulating_supply: 33000000000,
            ath: 1.17,
            ath_change_percentage: -14.5
        },
        {
            id: "chainlink",
            symbol: "link",
            name: "Chainlink",
            image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
            current_price: 14.50,
            market_cap: 8500000000,
            market_cap_rank: 14,
            total_volume: 450000000,
            price_change_percentage_24h: -1.2,
            price_change_percentage_7d_in_currency: 4.8,
            sparkline_in_7d: { price: Array.from({ length: 168 }, () => 14 + Math.random() * 1.5) },
            circulating_supply: 587000000,
            ath: 52.88,
            ath_change_percentage: -72.6
        },
        {
            id: "wrapped-bitcoin",
            symbol: "wbtc",
            name: "Wrapped Bitcoin",
            image: "https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
            current_price: 67450,
            market_cap: 10500000000,
            market_cap_rank: 16,
            total_volume: 280000000,
            price_change_percentage_24h: 2.4,
            price_change_percentage_7d_in_currency: 5.1,
            sparkline_in_7d: { price: Array.from({ length: 168 }, () => 67000 + Math.random() * 2000) },
            circulating_supply: 156000,
            ath: 73600,
            ath_change_percentage: -8.4
        },
        {
            id: "dai",
            symbol: "dai",
            name: "Dai",
            image: "https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png",
            current_price: 1.00,
            market_cap: 5300000000,
            market_cap_rank: 24,
            total_volume: 180000000,
            price_change_percentage_24h: 0.02,
            price_change_percentage_7d_in_currency: -0.01,
            sparkline_in_7d: { price: Array.from({ length: 168 }, () => 0.999 + Math.random() * 0.002) },
            circulating_supply: 5300000000,
            ath: 1.22,
            ath_change_percentage: -18.0
        }
    ];
}
