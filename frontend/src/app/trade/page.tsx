"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
    ArrowDownUp,
    Settings,
    Info,
    Loader2,
    Check,
    AlertCircle,
    Lock,
    Shield,
    ExternalLink,
    Eye,
    Route,
    Zap,
    ChevronDown,
    TrendingUp,
    RefreshCw,
    Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/blocks/navbar";
import { ShadowFooter } from "@/components/blocks/shadow-footer";
import { MOCK_TOKENS, CONTRACTS, findRoute, TOKENS, API_CONFIG, type TokenInfo } from "@/config/contracts";
import { SHADOW_ORDERS_HOOK_ABI, ERC20_ABI } from "@/config/abis";
import { useDemoMode } from "@/contexts/demo-mode-context";

type OrderType = "market" | "limit";

// Price cache to avoid excessive API calls
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30 seconds

// Simple FHE encryption simulation for demo
// In production, this would use Inco's fhevmjs SDK
function encryptForFHE(value: bigint): `0x${string}` {
    // Convert to 32-byte hex representation
    // Real implementation would use: await fhevm.encrypt256(value)
    return `0x${value.toString(16).padStart(64, "0")}` as `0x${string}`;
}

export default function TradePage() {
    const { address, isConnected } = useAccount();
    const { isDemoMode, setIsDemoMode, addOrder } = useDemoMode();

    // Token selection state
    const [fromToken, setFromToken] = useState<TokenInfo>(TOKENS.mUSDC);
    const [toToken, setToToken] = useState<TokenInfo>(TOKENS.mWETH);
    const [showFromTokens, setShowFromTokens] = useState(false);
    const [showToTokens, setShowToTokens] = useState(false);

    // Order state
    const [orderType, setOrderType] = useState<OrderType>("limit");
    const [amount, setAmount] = useState<string>("");
    const [limitPrice, setLimitPrice] = useState<string>("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [slippage, setSlippage] = useState<number>(0.5);

    // Market price state
    const [marketPrices, setMarketPrices] = useState<{ [key: string]: number }>({});
    const [isPriceLoading, setIsPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState<string | null>(null);

    // Calculate route
    const route = useMemo(() => {
        return findRoute(fromToken.symbol, toToken.symbol);
    }, [fromToken.symbol, toToken.symbol]);

    // Fetch market prices from CoinGecko
    const fetchMarketPrices = useCallback(async () => {
        setIsPriceLoading(true);
        setPriceError(null);

        try {
            // Get unique coingecko IDs
            const ids = MOCK_TOKENS.map(t => t.coingeckoId).join(',');

            // Check cache first
            const now = Date.now();
            const cachedPrices: { [key: string]: number } = {};
            let allCached = true;

            for (const token of MOCK_TOKENS) {
                const cached = priceCache[token.coingeckoId];
                if (cached && now - cached.timestamp < CACHE_DURATION) {
                    cachedPrices[token.symbol] = cached.price;
                } else {
                    allCached = false;
                }
            }

            if (allCached) {
                setMarketPrices(cachedPrices);
                setIsPriceLoading(false);
                return;
            }

            // Fetch from CoinGecko public API (free, no key required)
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
            );

            if (!response.ok) {
                // If rate limited or error, use fallback prices
                throw new Error('API unavailable');
            }

            const data = await response.json();
            const prices: { [key: string]: number } = {};

            for (const token of MOCK_TOKENS) {
                const price = data[token.coingeckoId]?.usd || 0;
                prices[token.symbol] = price;
                priceCache[token.coingeckoId] = { price, timestamp: now };
            }

            setMarketPrices(prices);
        } catch {
            // Use fallback prices silently
            setMarketPrices({
                mUSDC: 1,
                mDAI: 1,
                mWBTC: 97000,
                mWETH: 3200,
            });
        } finally {
            setIsPriceLoading(false);
        }
    }, []);

    // Fetch prices on mount and when tokens change
    useEffect(() => {
        fetchMarketPrices();
    }, [fetchMarketPrices]);

    // Calculate current market price between selected tokens
    const currentMarketPrice = useMemo(() => {
        const fromPrice = marketPrices[fromToken.symbol];
        const toPrice = marketPrices[toToken.symbol];

        if (!fromPrice || !toPrice || toPrice === 0) return null;

        // Price = how many toTokens you get per 1 fromToken
        // e.g., if fromToken is mWETH ($3200) and toToken is mUSDC ($1), 
        // you get 3200 mUSDC per 1 mWETH
        return fromPrice / toPrice;
    }, [fromToken.symbol, toToken.symbol, marketPrices]);

    // Auto-fill limit price with market price (with small buffer)
    const handleUseMarketPrice = () => {
        if (currentMarketPrice) {
            // For buying, set slightly above market (willing to pay more)
            const priceWithBuffer = currentMarketPrice * 1.005; // 0.5% buffer
            setLimitPrice(priceWithBuffer.toFixed(6));
        }
    };

    // Token balances
    const { data: fromBalance, refetch: refetchFromBalance } = useReadContract({
        address: fromToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    const { data: toBalance, refetch: refetchToBalance } = useReadContract({
        address: toToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    // Approval states
    const { data: fromAllowance } = useReadContract({
        address: fromToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address
            ? [address, CONTRACTS.SHADOW_ORDERS_HOOK as `0x${string}`]
            : undefined,
    });

    // Write contracts
    const {
        writeContract: approve,
        data: approveHash,
        isPending: isApproving,
    } = useWriteContract();
    const {
        writeContract: createOrder,
        data: orderHash,
        isPending: isCreating,
        error: orderError,
    } = useWriteContract();

    const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    const { isLoading: isConfirmingOrder, isSuccess: orderSuccess } =
        useWaitForTransactionReceipt({
            hash: orderHash,
        });

    // Track which orders we've already added to prevent duplicates
    const addedOrdersRef = useRef<Set<string>>(new Set());

    // Store values at time of order creation for the effect
    const orderDataRef = useRef<{
        limitPrice: string;
        amount: string;
        fromToken: string;
        toToken: string;
        startPrice: number | null;
    } | null>(null);

    // Capture order data when creating order
    const handleCreateOrder = () => {
        if (!amount || !limitPrice || route.route.length === 0) {
            console.log("❌ Cannot create order - missing required fields. Amount:", amount, "LimitPrice:", limitPrice, "Route length:", route.route.length);
            return;
        }

        console.log("📝 Capturing order data for order creation");
        // Store data for after tx confirms
        orderDataRef.current = {
            limitPrice,
            amount,
            fromToken: fromToken.symbol,
            toToken: toToken.symbol,
            startPrice: currentMarketPrice,
        };
        console.log("📝 Order data captured:", orderDataRef.current);

        // Encrypt values using FHE (simulated for demo)
        const amountInWei = parseUnits(amount, fromToken.decimals);
        const priceInWei = parseUnits(limitPrice, 18); // Use 18 decimals for price

        // In production, these would be actual FHE ciphertexts from Inco's SDK
        const encryptedPrice = encryptForFHE(priceInWei);
        const encryptedAmount = encryptForFHE(amountInWei);
        const inputProof = "0x" as `0x${string}`; // Empty proof for demo

        // Use the first pool in the route for now
        // Multi-hop would require additional contract logic
        console.log("🚀 Submitting order to contract. Pool:", route.route[0]);
        createOrder({
            address: CONTRACTS.SHADOW_ORDERS_HOOK as `0x${string}`,
            abi: SHADOW_ORDERS_HOOK_ABI,
            functionName: "createOrder",
            args: [
                route.route[0] as `0x${string}`,
                encryptedPrice,
                encryptedAmount,
                inputProof,
                true, // isBuyOrder
            ],
        });
        console.log("📤 Order submitted to wallet");
    };

    // For Demo Mode: Add order immediately when tx is SUBMITTED (has hash)
    // This allows price simulation to start right away without waiting for confirmation
    useEffect(() => {
        if (isDemoMode && orderHash && !addedOrdersRef.current.has(orderHash)) {
            const orderData = orderDataRef.current;
            console.log("🎭 Demo Mode: TX submitted with hash:", orderHash);
            console.log("Order data from ref:", orderData);
            
            if (orderData && orderData.limitPrice && orderData.amount) {
                console.log("✨ Adding order to demo tracking immediately:", orderData);
                addedOrdersRef.current.add(orderHash);
                
                const startPrice = orderData.startPrice || (Number(orderData.limitPrice) * 1.05);
                console.log("Creating order with startPrice:", startPrice);
                addOrder({
                    orderId: `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    txHash: orderHash,
                    fromToken: orderData.fromToken,
                    toToken: orderData.toToken,
                    amount: orderData.amount,
                    limitPrice: Number(orderData.limitPrice),
                    startPrice: startPrice,
                });
                // Clear the ref after adding
                orderDataRef.current = null;
            }
        }
    }, [isDemoMode, orderHash, addOrder]);

    // For Live Mode: Refetch balances after confirmed tx
    useEffect(() => {
        if (orderSuccess && orderHash) {
            console.log("✅ Order confirmed on-chain:", orderHash);
            refetchFromBalance();
            refetchToBalance();
        }
    }, [orderSuccess, orderHash, refetchFromBalance, refetchToBalance]);

    // Format balances
    const formattedFromBalance = fromBalance
        ? Number(formatUnits(fromBalance as bigint, fromToken.decimals)).toFixed(4)
        : "0";
    const formattedToBalance = toBalance
        ? Number(formatUnits(toBalance as bigint, toToken.decimals)).toFixed(4)
        : "0";

    // Check if approval is needed
    const amountToSpend = amount
        ? parseUnits(amount, fromToken.decimals)
        : BigInt(0);
    const needsApproval =
        fromAllowance !== undefined &&
        amountToSpend > (fromAllowance as bigint);

    // Calculate estimated output
    const estimatedOutput =
        amount && limitPrice
            ? (Number(amount) / Number(limitPrice)).toFixed(6)
            : "0";

    const handleSwapTokens = () => {
        const temp = fromToken;
        setFromToken(toToken);
        setToToken(temp);
        setAmount("");
        setLimitPrice("");
    };

    const handleSelectFromToken = (token: TokenInfo) => {
        if (token.symbol === toToken.symbol) {
            setToToken(fromToken);
        }
        setFromToken(token);
        setShowFromTokens(false);
    };

    const handleSelectToToken = (token: TokenInfo) => {
        if (token.symbol === fromToken.symbol) {
            setFromToken(toToken);
        }
        setToToken(token);
        setShowToTokens(false);
    };

    const handleApprove = () => {
        approve({
            address: fromToken.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [
                CONTRACTS.SHADOW_ORDERS_HOOK as `0x${string}`,
                amountToSpend * BigInt(2),
            ],
        });
    };

    const handleSetPercentage = (percentage: number) => {
        if (fromBalance) {
            const val =
                (Number(formatUnits(fromBalance as bigint, fromToken.decimals)) *
                    percentage) /
                100;
            setAmount(val.toFixed(6));
        }
    };

    return (
        <>
            <Navbar />
            <TooltipProvider>
                <main className="min-h-screen bg-background pt-20">
                    <div className="container py-8">
                        {/* Demo Mode Toggle Banner */}
                        <div className="mb-6 flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                            <div className="flex items-center gap-3">
                                {isDemoMode ? (
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                ) : (
                                    <Activity className="h-5 w-5 text-green-500" />
                                )}
                                <div>
                                    <p className="font-semibold">
                                        {isDemoMode ? "Demo Mode" : "Live Mode"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {isDemoMode
                                            ? "Simulated price movement after order creation"
                                            : "Keeper monitors real market prices"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="demo-toggle" className="text-sm">
                                    {isDemoMode ? "Demo" : "Live"}
                                </Label>
                                <Switch
                                    id="demo-toggle"
                                    checked={isDemoMode}
                                    onCheckedChange={setIsDemoMode}
                                />
                            </div>
                        </div>

                        <div className="grid gap-8 lg:grid-cols-3">
                            {/* Main Trading Card */}
                            <div className="lg:col-span-2">
                                <Card className="border-2">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="h-5 w-5 text-primary" />
                                                Create Shadow Order
                                            </CardTitle>
                                            <CardDescription>
                                                Your order details are encrypted with Inco FHE
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Order Type Header */}
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <Lock className="h-4 w-4 text-primary" />
                                            <span className="font-semibold">Limit Order</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                <Shield className="h-3 w-3 mr-1" />
                                                FHE Protected
                                            </Badge>
                                        </div>

                                        {/* From Token Input */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>You Pay</Label>
                                                <span className="text-sm text-muted-foreground">
                                                    Balance: {formattedFromBalance} {fromToken.symbol}
                                                </span>
                                            </div>
                                            <div className="relative rounded-xl border bg-muted/30 p-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        className="border-0 bg-transparent text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
                                                    />
                                                    <Popover
                                                        open={showFromTokens}
                                                        onOpenChange={setShowFromTokens}
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button variant="secondary" className="gap-2 px-3">
                                                                <span className="text-xl">{fromToken.icon}</span>
                                                                <span className="font-semibold">
                                                                    {fromToken.symbol}
                                                                </span>
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-2" align="end">
                                                            <div className="space-y-1">
                                                                {MOCK_TOKENS.map((token) => (
                                                                    <Button
                                                                        key={token.symbol}
                                                                        variant={
                                                                            token.symbol === fromToken.symbol
                                                                                ? "secondary"
                                                                                : "ghost"
                                                                        }
                                                                        className="w-full justify-start gap-3"
                                                                        onClick={() => handleSelectFromToken(token)}
                                                                    >
                                                                        <span className="text-xl">{token.icon}</span>
                                                                        <div className="text-left">
                                                                            <div className="font-medium">
                                                                                {token.symbol}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {token.name}
                                                                            </div>
                                                                        </div>
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="flex justify-end mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs"
                                                        onClick={() => handleSetPercentage(100)}
                                                    >
                                                        Max
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Swap Button */}
                                        <div className="flex justify-center -my-2 relative z-10">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="rounded-full bg-background"
                                                onClick={handleSwapTokens}
                                            >
                                                <ArrowDownUp className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* To Token Input */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>You Receive</Label>
                                                <span className="text-sm text-muted-foreground">
                                                    Balance: {formattedToBalance} {toToken.symbol}
                                                </span>
                                            </div>
                                            <div className="relative rounded-xl border bg-muted/30 p-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="text-2xl font-semibold text-muted-foreground">
                                                        {estimatedOutput !== "0"
                                                            ? `~${estimatedOutput}`
                                                            : "0.00"}
                                                    </div>
                                                    <Popover
                                                        open={showToTokens}
                                                        onOpenChange={setShowToTokens}
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button variant="secondary" className="gap-2 px-3">
                                                                <span className="text-xl">{toToken.icon}</span>
                                                                <span className="font-semibold">
                                                                    {toToken.symbol}
                                                                </span>
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-2" align="end">
                                                            <div className="space-y-1">
                                                                {MOCK_TOKENS.map((token) => (
                                                                    <Button
                                                                        key={token.symbol}
                                                                        variant={
                                                                            token.symbol === toToken.symbol
                                                                                ? "secondary"
                                                                                : "ghost"
                                                                        }
                                                                        className="w-full justify-start gap-3"
                                                                        onClick={() => handleSelectToToken(token)}
                                                                    >
                                                                        <span className="text-xl">{token.icon}</span>
                                                                        <div className="text-left">
                                                                            <div className="font-medium">
                                                                                {token.symbol}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {token.name}
                                                                            </div>
                                                                        </div>
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Current Market Price Display */}
                                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">Current Market Price</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={fetchMarketPrices}
                                                    disabled={isPriceLoading}
                                                    className="h-8 px-2"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${isPriceLoading ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {isPriceLoading ? (
                                                        <span className="text-lg font-semibold text-muted-foreground">Loading...</span>
                                                    ) : currentMarketPrice ? (
                                                        <>
                                                            <span className="text-2xl font-bold text-primary">
                                                                {currentMarketPrice < 0.01
                                                                    ? currentMarketPrice.toFixed(8)
                                                                    : currentMarketPrice >= 100
                                                                        ? currentMarketPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                                        : currentMarketPrice.toFixed(4)}
                                                            </span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {toToken.symbol} per {fromToken.symbol}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-lg font-semibold text-muted-foreground">--</span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleUseMarketPrice}
                                                    disabled={!currentMarketPrice}
                                                    className="text-xs"
                                                >
                                                    Use Market Price
                                                </Button>
                                            </div>
                                            {marketPrices[fromToken.symbol] && marketPrices[toToken.symbol] && (
                                                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                                    <span>{fromToken.symbol}: ${marketPrices[fromToken.symbol]?.toLocaleString()}</span>
                                                    <span>{toToken.symbol}: ${marketPrices[toToken.symbol]?.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Limit Price Input */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label>Your Limit Price</Label>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>This price is encrypted using Inco TFHE - no one can see your order price!</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Badge
                                                    variant="outline"
                                                    className="ml-auto gap-1 text-xs"
                                                >
                                                    <Lock className="h-3 w-3" />
                                                    FHE Encrypted
                                                </Badge>
                                            </div>
                                            <div className="relative rounded-xl border bg-muted/30 p-4">
                                                <div className="flex items-center gap-4">
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={limitPrice}
                                                        onChange={(e) => setLimitPrice(e.target.value)}
                                                        className="border-0 bg-transparent text-xl font-semibold p-0 h-auto focus-visible:ring-0"
                                                    />
                                                    <span className="text-muted-foreground font-medium">
                                                        {fromToken.symbol} per {toToken.symbol}
                                                    </span>
                                                </div>
                                                {limitPrice && currentMarketPrice && (
                                                    <div className="mt-2 text-xs">
                                                        {Number(limitPrice) > currentMarketPrice ? (
                                                            <span className="text-green-500">
                                                                ↑ {((Number(limitPrice) / currentMarketPrice - 1) * 100).toFixed(2)}% above market
                                                            </span>
                                                        ) : Number(limitPrice) < currentMarketPrice ? (
                                                            <span className="text-amber-500">
                                                                ↓ {((1 - Number(limitPrice) / currentMarketPrice) * 100).toFixed(2)}% below market
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">At market price</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Route Display */}
                                        {route.route.length > 0 && (
                                            <div className="rounded-lg border bg-muted/30 p-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Route className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">Route:</span>
                                                    <div className="flex items-center gap-1">
                                                        <span>
                                                            {fromToken.icon} {fromToken.symbol}
                                                        </span>
                                                        {route.isMultiHop && (
                                                            <>
                                                                <span className="text-muted-foreground">→</span>
                                                                <span>⟠ mWETH</span>
                                                            </>
                                                        )}
                                                        <span className="text-muted-foreground">→</span>
                                                        <span>
                                                            {toToken.icon} {toToken.symbol}
                                                        </span>
                                                    </div>
                                                    {route.isMultiHop && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-auto text-xs"
                                                        >
                                                            Multi-hop
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {route.route.length === 0 &&
                                            fromToken.symbol !== toToken.symbol && (
                                                <Alert variant="destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        No route found between {fromToken.symbol} and{" "}
                                                        {toToken.symbol}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                        {/* Advanced Settings */}
                                        {showAdvanced && (
                                            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                                                <h4 className="font-medium">Advanced Settings</h4>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label>Slippage Tolerance</Label>
                                                        <span className="text-sm font-medium">
                                                            {slippage}%
                                                        </span>
                                                    </div>
                                                    <Slider
                                                        value={[slippage]}
                                                        onValueChange={([v]) => setSlippage(v)}
                                                        max={5}
                                                        step={0.1}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Order Summary */}
                                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <Eye className="h-4 w-4" />
                                                Order Preview
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Swap</span>
                                                    <span className="font-medium">
                                                        {amount || "0"} {fromToken.symbol} → {estimatedOutput}{" "}
                                                        {toToken.symbol}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Limit Price
                                                    </span>
                                                    <span className="font-medium flex items-center gap-1">
                                                        <Lock className="h-3 w-3 text-primary" />
                                                        {limitPrice || "0"} {fromToken.symbol}/{toToken.symbol}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Network Fee
                                                    </span>
                                                    <span className="font-medium">~$0.01</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        FHE Fee (Inco)
                                                    </span>
                                                    <span className="font-medium">~0.001 ETH</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error Message */}
                                        {orderError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    {orderError.message.includes("User rejected")
                                                        ? "Transaction was rejected"
                                                        : "Failed to create order. Please try again."}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Success Message */}
                                        {orderSuccess && orderHash && (
                                            <Alert className="border-green-500 bg-green-500/10">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <AlertDescription className="text-green-600 space-y-2">
                                                    <p>
                                                        Order created successfully!{" "}
                                                        <a
                                                            href={`https://sepolia.basescan.org/tx/${orderHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="underline"
                                                        >
                                                            View transaction
                                                        </a>
                                                    </p>
                                                    {isDemoMode && (
                                                        <p className="text-sm">
                                                            🎮 Demo mode: Watch price simulation on{" "}
                                                            <a href="/orders" className="underline font-semibold">
                                                                My Orders →
                                                            </a>
                                                        </p>
                                                    )}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Action Button */}
                                        {!isConnected ? (
                                            <Button className="w-full h-14 text-lg" disabled>
                                                Connect Wallet to Trade
                                            </Button>
                                        ) : route.route.length === 0 ? (
                                            <Button className="w-full h-14 text-lg" disabled>
                                                No Route Available
                                            </Button>
                                        ) : needsApproval ? (
                                            <Button
                                                className="w-full h-14 text-lg"
                                                onClick={handleApprove}
                                                disabled={isApproving || isConfirmingApprove}
                                            >
                                                {isApproving ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Confirm in Wallet...
                                                    </>
                                                ) : isConfirmingApprove ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Approving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="mr-2 h-5 w-5" />
                                                        Approve {fromToken.symbol}
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
                                                onClick={handleCreateOrder}
                                                disabled={
                                                    !amount || !limitPrice || isCreating || isConfirmingOrder
                                                }
                                            >
                                                {isCreating ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Confirm in Wallet...
                                                    </>
                                                ) : isConfirmingOrder ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Creating Encrypted Order...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield className="mr-2 h-5 w-5" />
                                                        Create Shadow Order
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Side Panel */}
                            <div className="space-y-6">
                                {/* FHE Explanation */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Lock className="h-5 w-5 text-primary" />
                                            How FHE Works
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs font-bold text-primary">
                                                        1
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Client-Side Encryption</p>
                                                    <p className="text-muted-foreground">
                                                        Your limit price and amount are encrypted in your
                                                        browser using Inco&apos;s TFHE library
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs font-bold text-primary">
                                                        2
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">On-Chain Storage</p>
                                                    <p className="text-muted-foreground">
                                                        Encrypted ciphertext is stored on Base Sepolia - no
                                                        one can see your order details
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs font-bold text-primary">
                                                        3
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        Computation on Encrypted Data
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                        Keepers can check if price conditions are met without
                                                        decrypting
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-xs font-bold text-primary">
                                                        4
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">MEV-Free Execution</p>
                                                    <p className="text-muted-foreground">
                                                        Order executes via Uniswap V4 hook when conditions are
                                                        met
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">
                                                Powered by{" "}
                                                <a
                                                    href="https://www.inco.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    Inco Network
                                                </a>{" "}
                                                TFHE (Threshold Fully Homomorphic Encryption)
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Wallet Balances */}
                                {isConnected && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Your Balances</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {MOCK_TOKENS.map((token) => (
                                                    <TokenBalance
                                                        key={token.symbol}
                                                        token={token}
                                                        address={address!}
                                                    />
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Contract Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Contract Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Hook</span>
                                            <a
                                                href={`https://sepolia.basescan.org/address/${CONTRACTS.SHADOW_ORDERS_HOOK}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-primary hover:underline"
                                            >
                                                {CONTRACTS.SHADOW_ORDERS_HOOK.slice(0, 6)}...
                                                {CONTRACTS.SHADOW_ORDERS_HOOK.slice(-4)}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Network</span>
                                            <span>Base Sepolia (Testnet)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Chain ID</span>
                                            <span>84532</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>
            </TooltipProvider>
            <ShadowFooter />
        </>
    );
}

// Token Balance Component
function TokenBalance({
    token,
    address,
}: {
    token: TokenInfo;
    address: string;
}) {
    const { data: balance } = useReadContract({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
    });

    const formatted = balance
        ? Number(formatUnits(balance as bigint, token.decimals)).toFixed(4)
        : "0";

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-lg">{token.icon}</span>
                <span className="font-medium">{token.symbol}</span>
            </div>
            <span className="font-mono">{formatted}</span>
        </div>
    );
}
