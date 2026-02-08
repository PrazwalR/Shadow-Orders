"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, parseEther } from "viem";
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
    ChevronDown,
    TrendingUp,
    RefreshCw,
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
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Navbar } from "@/components/blocks/navbar";
import { ShadowFooter } from "@/components/blocks/shadow-footer";
import {
    MOCK_TOKENS,
    CONTRACTS,
    findRoute,
    TOKENS,
    getPoolForPair,
    type TokenInfo,
} from "@/config/contracts";
import { ERC20_ABI, SHADOW_ORDERS_HOOK_ABI } from "@/config/abis";
import { useOrderTracking } from "@/contexts/order-tracking-context";
import { encryptOrderParams } from "@/lib/fhe";

// Price cache to avoid excessive API calls
const priceCache: { [key: string]: { price: number; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30 seconds

// FHE fee per operation (3 operations: price + amount + isBuy)
const FHE_FEE = parseEther("0.0003");

export default function TradePage() {
    const { address, isConnected } = useAccount();
    const { addOrder } = useOrderTracking();

    // Token selection
    const [fromToken, setFromToken] = useState<TokenInfo>(TOKENS.mUSDC);
    const [toToken, setToToken] = useState<TokenInfo>(TOKENS.mWETH);
    const [showFromTokens, setShowFromTokens] = useState(false);
    const [showToTokens, setShowToTokens] = useState(false);

    // Order state
    const [amount, setAmount] = useState<string>("");
    const [limitPrice, setLimitPrice] = useState<string>("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [slippage, setSlippage] = useState<number>(0.5);

    // Market prices (real data from CoinGecko)
    const [marketPrices, setMarketPrices] = useState<{ [key: string]: number }>({});
    const [isPriceLoading, setIsPriceLoading] = useState(false);

    // Order creation flow
    const [isEncrypting, setIsEncrypting] = useState(false);
    const [orderCreated, setOrderCreated] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);

    // Route
    const route = useMemo(
        () => findRoute(fromToken.symbol, toToken.symbol),
        [fromToken.symbol, toToken.symbol]
    );

    // ─── createOrder transaction via wagmi ───
    const {
        writeContract: writeCreateOrder,
        data: createOrderHash,
        isPending: isCreateOrderPending,
        error: createOrderError,
        reset: resetCreateOrder,
    } = useWriteContract();

    const {
        isLoading: isConfirmingOrder,
        isSuccess: isOrderConfirmed,
        data: orderReceipt,
    } = useWaitForTransactionReceipt({ hash: createOrderHash });

    // ─── When TX is confirmed on-chain, add order to tracker ───
    useEffect(() => {
        if (isOrderConfirmed && createOrderHash && orderReceipt) {
            // Capture the market price at the moment the TX confirms
            const startPrice = currentMarketPrice || Number(limitPrice) * 1.05;

            // Parse orderId from OrderCreated event logs
            let onChainOrderId: string | undefined;
            for (const log of orderReceipt.logs) {
                // OrderCreated event topic: keccak256("OrderCreated(uint256,address,bytes32,uint256)")
                // The orderId is the first indexed param (topics[1])
                if (log.address.toLowerCase() === CONTRACTS.SHADOW_ORDERS_HOOK.toLowerCase() && log.topics[1]) {
                    onChainOrderId = BigInt(log.topics[1]).toString();
                    break;
                }
            }

            addOrder({
                orderId: onChainOrderId || `order-${createOrderHash.slice(0, 16)}`,
                txHash: createOrderHash,
                fromToken: fromToken.symbol,
                toToken: toToken.symbol,
                amount,
                limitPrice: Number(limitPrice),
                startPrice,
            });

            setOrderCreated(true);
            setOrderError(null);
            resetCreateOrder();
            setTimeout(() => setOrderCreated(false), 8000);

            console.log(`✅ Shadow Order confirmed on-chain!`);
            console.log(`   TX: https://sepolia.basescan.org/tx/${createOrderHash}`);
            console.log(`   On-chain Order ID: ${onChainOrderId ?? "N/A"}`);
            console.log(`   Start price: ${startPrice} | Limit price: ${limitPrice}`);
            console.log(`   Simulation started → keeper will execute swap when limit is reached`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOrderConfirmed, createOrderHash]);

    // Handle createOrder TX error
    useEffect(() => {
        if (createOrderError) {
            const msg = (createOrderError as Error & { shortMessage?: string })?.shortMessage
                || createOrderError.message || "Transaction failed";
            setOrderError(msg);
            setIsEncrypting(false);
            console.error("❌ createOrder TX failed:", msg);
        }
    }, [createOrderError]);

    // ─── Fetch real market prices ───
    const fetchMarketPrices = useCallback(async () => {
        setIsPriceLoading(true);
        try {
            const ids = MOCK_TOKENS.map((t) => t.coingeckoId).join(",");
            const now = Date.now();
            const cached: { [k: string]: number } = {};
            let allCached = true;

            for (const token of MOCK_TOKENS) {
                const c = priceCache[token.coingeckoId];
                if (c && now - c.timestamp < CACHE_DURATION) {
                    cached[token.symbol] = c.price;
                } else {
                    allCached = false;
                }
            }
            if (allCached) {
                setMarketPrices(cached);
                setIsPriceLoading(false);
                return;
            }

            const res = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
            );
            if (!res.ok) throw new Error("API unavailable");
            const data = await res.json();
            const prices: { [k: string]: number } = {};
            for (const token of MOCK_TOKENS) {
                const p = data[token.coingeckoId]?.usd || 0;
                prices[token.symbol] = p;
                priceCache[token.coingeckoId] = { price: p, timestamp: now };
            }
            setMarketPrices(prices);
        } catch {
            // Fallback prices
            setMarketPrices({ mUSDC: 1, mDAI: 1, mWBTC: 97000, mWETH: 3200 });
        } finally {
            setIsPriceLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMarketPrices();
    }, [fetchMarketPrices]);

    // Current market price: toTokens per fromToken
    const currentMarketPrice = useMemo(() => {
        const fp = marketPrices[fromToken.symbol];
        const tp = marketPrices[toToken.symbol];
        if (!fp || !tp || tp === 0) return null;
        return fp / tp;
    }, [fromToken.symbol, toToken.symbol, marketPrices]);

    const handleUseMarketPrice = () => {
        if (currentMarketPrice) setLimitPrice((currentMarketPrice * 1.005).toFixed(6));
    };

    // ─── On-chain reads ───
    const { data: fromBalance } = useReadContract({
        address: fromToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });
    const { data: toBalance } = useReadContract({
        address: toToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });
    const { data: fromAllowance } = useReadContract({
        address: fromToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, CONTRACTS.KEEPER_ADDRESS as `0x${string}`] : undefined,
    });

    // Approve tokens for the keeper to pull later
    const {
        writeContract: approve,
        data: approveHash,
        isPending: isApproving,
    } = useWriteContract();
    const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    const formattedFromBalance = fromBalance
        ? Number(formatUnits(fromBalance as bigint, fromToken.decimals)).toFixed(4)
        : "0";
    const formattedToBalance = toBalance
        ? Number(formatUnits(toBalance as bigint, toToken.decimals)).toFixed(4)
        : "0";

    const amountToSpend = amount ? parseUnits(amount, fromToken.decimals) : BigInt(0);
    const needsApproval =
        fromAllowance !== undefined && amountToSpend > (fromAllowance as bigint);

    // Estimated output
    const estimatedOutput = useMemo(() => {
        if (!amount || !limitPrice || Number(limitPrice) === 0) return "0";
        const raw = Number(amount) * Number(limitPrice);
        if (raw < 0.0001) return raw.toFixed(8);
        if (raw < 1) return raw.toFixed(6);
        if (raw < 1000) return raw.toFixed(4);
        return raw.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }, [amount, limitPrice]);

    // ─── Create Shadow Order: Encrypt → Sign TX → Confirm → Track ───
    const handleCreateOrder = async () => {
        if (!amount || !limitPrice || !address || route.route.length === 0) return;

        setOrderError(null);
        setIsEncrypting(true);

        try {
            // Step 1: Encrypt order parameters using Inco FHE SDK
            console.log("🔐 Encrypting order with Inco FHE...");
            console.log(`   Amount: ${amount} ${fromToken.symbol}`);
            console.log(`   Limit Price: ${limitPrice} ${toToken.symbol}/${fromToken.symbol}`);
            console.log(`   User Address: ${address}`);

            const limitPriceWei = parseUnits(limitPrice, 18); // price as uint256
            const amountWei = parseUnits(amount, fromToken.decimals);
            // Buy order = we're buying toToken (price going up means good for us)
            const isBuyOrder = currentMarketPrice
                ? Number(limitPrice) > currentMarketPrice
                : true;

            console.log(`   Encrypting: limitPrice=${limitPriceWei.toString()}, amount=${amountWei.toString()}, isBuy=${isBuyOrder}`);

            const { encryptedPrice, encryptedAmount, encryptedIsBuy } =
                await encryptOrderParams(
                    limitPriceWei,
                    amountWei,
                    isBuyOrder,
                    address as `0x${string}`
                );

            console.log("✅ FHE encryption complete");
            console.log(`   Encrypted price: ${encryptedPrice.slice(0, 20)}...`);
            console.log(`   Encrypted amount: ${encryptedAmount.slice(0, 20)}...`);
            console.log(`   Encrypted isBuy: ${encryptedIsBuy.slice(0, 20)}...`);

            // Step 2: Build the poolKey for the contract call
            // The contract sorts tokens by address (currency0 < currency1)
            const pool = getPoolForPair(fromToken.symbol, toToken.symbol);
            let token0Addr: string;
            let token1Addr: string;

            if (pool) {
                // Direct pool
                const t0 = TOKENS[pool.token0 as keyof typeof TOKENS];
                const t1 = TOKENS[pool.token1 as keyof typeof TOKENS];
                // Ensure correct sort order (lower address = currency0)
                if (t0.address.toLowerCase() < t1.address.toLowerCase()) {
                    token0Addr = t0.address;
                    token1Addr = t1.address;
                } else {
                    token0Addr = t1.address;
                    token1Addr = t0.address;
                }
            } else {
                // Multi-hop: use first leg (fromToken → mWETH)
                const leg = getPoolForPair(fromToken.symbol, "mWETH");
                if (!leg) throw new Error("No pool route found");
                const t0 = TOKENS[leg.token0 as keyof typeof TOKENS];
                const t1 = TOKENS[leg.token1 as keyof typeof TOKENS];
                if (t0.address.toLowerCase() < t1.address.toLowerCase()) {
                    token0Addr = t0.address;
                    token1Addr = t1.address;
                } else {
                    token0Addr = t1.address;
                    token1Addr = t0.address;
                }
            }

            const poolKey = {
                currency0: token0Addr as `0x${string}`,
                currency1: token1Addr as `0x${string}`,
                fee: 3000,
                tickSpacing: 60,
                hooks: CONTRACTS.SHADOW_ORDERS_HOOK as `0x${string}`,
            };

            console.log("📤 Sending createOrder TX to ShadowOrdersHook...");
            console.log(`   Pool: ${poolKey.currency0.slice(0, 10)}... / ${poolKey.currency1.slice(0, 10)}...`);
            console.log(`   Fee: 0.0003 ETH`);

            setIsEncrypting(false);

            // Step 3: Send the transaction (user signs in wallet)
            writeCreateOrder({
                address: CONTRACTS.SHADOW_ORDERS_HOOK as `0x${string}`,
                abi: SHADOW_ORDERS_HOOK_ABI,
                functionName: "createOrder",
                args: [poolKey, encryptedPrice, encryptedAmount, encryptedIsBuy],
                value: FHE_FEE,
                gas: BigInt(1_000_000), // Explicit gas limit for FHE operations
            });
        } catch (err) {
            setIsEncrypting(false);
            const msg = (err as Error)?.message || "FHE encryption failed";
            setOrderError(msg);
            console.error("❌ Order creation failed:", err);
            console.error("   Error details:", JSON.stringify(err, null, 2));
        }
    };

    const isOrderInProgress = isEncrypting || isCreateOrderPending || isConfirmingOrder;

    const handleSwapTokens = () => {
        setFromToken(toToken);
        setToToken(fromToken);
        setAmount("");
        setLimitPrice("");
    };
    const handleSelectFromToken = (t: TokenInfo) => {
        if (t.symbol === toToken.symbol) setToToken(fromToken);
        setFromToken(t);
        setShowFromTokens(false);
    };
    const handleSelectToToken = (t: TokenInfo) => {
        if (t.symbol === fromToken.symbol) setFromToken(toToken);
        setToToken(t);
        setShowToTokens(false);
    };
    const handleApprove = () => {
        approve({
            address: fromToken.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACTS.KEEPER_ADDRESS as `0x${string}`, amountToSpend * BigInt(2)],
        });
    };
    const handleSetPercentage = (pct: number) => {
        if (fromBalance)
            setAmount(
                ((Number(formatUnits(fromBalance as bigint, fromToken.decimals)) * pct) / 100).toFixed(6)
            );
    };

    // ─── Render ───
    return (
        <>
            <Navbar />
            <TooltipProvider>
                <main className="min-h-screen bg-background pt-20">
                    <div className="container py-8">
                        <div className="grid gap-8 lg:grid-cols-3">
                            {/* ─── Main Trading Card ─── */}
                            <div className="lg:col-span-2">
                                <Card className="border-2">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="h-5 w-5 text-primary" />
                                                Create Shadow Order
                                            </CardTitle>
                                            <CardDescription>
                                                Your order details are encrypted with Inco FHE &amp; sent on-chain
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
                                        {/* Order Type */}
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <Lock className="h-4 w-4 text-primary" />
                                            <span className="font-semibold">Encrypted Limit Order</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                <Shield className="h-3 w-3 mr-1" />
                                                FHE Protected
                                            </Badge>
                                        </div>

                                        {/* From Token */}
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
                                                    <Popover open={showFromTokens} onOpenChange={setShowFromTokens}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="secondary" className="gap-2 px-3">
                                                                <span className="text-xl">{fromToken.icon}</span>
                                                                <span className="font-semibold">{fromToken.symbol}</span>
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-2" align="end">
                                                            <div className="space-y-1">
                                                                {MOCK_TOKENS.map((token) => (
                                                                    <Button
                                                                        key={token.symbol}
                                                                        variant={token.symbol === fromToken.symbol ? "secondary" : "ghost"}
                                                                        className="w-full justify-start gap-3"
                                                                        onClick={() => handleSelectFromToken(token)}
                                                                    >
                                                                        <span className="text-xl">{token.icon}</span>
                                                                        <div className="text-left">
                                                                            <div className="font-medium">{token.symbol}</div>
                                                                            <div className="text-xs text-muted-foreground">{token.name}</div>
                                                                        </div>
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="flex justify-end mt-2">
                                                    <Button variant="outline" size="sm" className="text-xs" onClick={() => handleSetPercentage(100)}>
                                                        Max
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Swap Direction */}
                                        <div className="flex justify-center -my-2 relative z-10">
                                            <Button variant="outline" size="icon" className="rounded-full bg-background" onClick={handleSwapTokens}>
                                                <ArrowDownUp className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* To Token */}
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
                                                        {estimatedOutput !== "0" ? `~${estimatedOutput}` : "0.00"}
                                                    </div>
                                                    <Popover open={showToTokens} onOpenChange={setShowToTokens}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="secondary" className="gap-2 px-3">
                                                                <span className="text-xl">{toToken.icon}</span>
                                                                <span className="font-semibold">{toToken.symbol}</span>
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-56 p-2" align="end">
                                                            <div className="space-y-1">
                                                                {MOCK_TOKENS.map((token) => (
                                                                    <Button
                                                                        key={token.symbol}
                                                                        variant={token.symbol === toToken.symbol ? "secondary" : "ghost"}
                                                                        className="w-full justify-start gap-3"
                                                                        onClick={() => handleSelectToToken(token)}
                                                                    >
                                                                        <span className="text-xl">{token.icon}</span>
                                                                        <div className="text-left">
                                                                            <div className="font-medium">{token.symbol}</div>
                                                                            <div className="text-xs text-muted-foreground">{token.name}</div>
                                                                        </div>
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Market Price */}
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
                                                    <RefreshCw className={`h-3 w-3 ${isPriceLoading ? "animate-spin" : ""}`} />
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

                                        {/* Limit Price */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label>Your Limit Price</Label>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>This price is encrypted using Inco TFHE — no one can see your order price!</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Badge variant="outline" className="ml-auto gap-1 text-xs">
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
                                                        {toToken.symbol} per {fromToken.symbol}
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

                                        {/* Route */}
                                        {route.route.length > 0 && (
                                            <div className="rounded-lg border bg-muted/30 p-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Route className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">Route:</span>
                                                    <span>{fromToken.icon} {fromToken.symbol}</span>
                                                    {route.isMultiHop && (
                                                        <>
                                                            <span className="text-muted-foreground">→</span>
                                                            <span>⟠ mWETH</span>
                                                        </>
                                                    )}
                                                    <span className="text-muted-foreground">→</span>
                                                    <span>{toToken.icon} {toToken.symbol}</span>
                                                    {route.isMultiHop && (
                                                        <Badge variant="secondary" className="ml-auto text-xs">Multi-hop</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {route.route.length === 0 && fromToken.symbol !== toToken.symbol && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    No route found between {fromToken.symbol} and {toToken.symbol}
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
                                                        <span className="text-sm font-medium">{slippage}%</span>
                                                    </div>
                                                    <Slider value={[slippage]} onValueChange={([v]) => setSlippage(v)} max={5} step={0.1} className="w-full" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Order Preview */}
                                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <Eye className="h-4 w-4" />
                                                Order Preview
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Swap</span>
                                                    <span className="font-medium">{amount || "0"} {fromToken.symbol} → {estimatedOutput} {toToken.symbol}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Limit Price</span>
                                                    <span className="font-medium flex items-center gap-1">
                                                        <Lock className="h-3 w-3 text-primary" />
                                                        {limitPrice || "0"} {toToken.symbol}/{fromToken.symbol}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Network Fee</span>
                                                    <span className="font-medium">~$0.01</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">FHE Fee (Inco)</span>
                                                    <span className="font-medium">0.0003 ETH</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error */}
                                        {orderError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{orderError}</AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Success */}
                                        {orderCreated && createOrderHash && (
                                            <Alert className="border-green-500 bg-green-500/10">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <AlertDescription className="text-green-600 space-y-2">
                                                    <p className="font-semibold">Shadow Order confirmed on-chain! ✅</p>
                                                    <p className="text-sm">
                                                        Your encrypted limit order has been submitted to the ShadowOrdersHook.
                                                        Price simulation started — when the limit is reached, the keeper will execute the swap.
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={`https://sepolia.basescan.org/tx/${createOrderHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            View TX on BaseScan
                                                        </a>
                                                        <span className="text-muted-foreground">•</span>
                                                        <a href="/orders" className="underline font-semibold text-sm">
                                                            Track on My Orders →
                                                        </a>
                                                    </div>
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
                                                        Approve {fromToken.symbol} for Keeper
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
                                                onClick={handleCreateOrder}
                                                disabled={!amount || !limitPrice || isOrderInProgress}
                                            >
                                                {isEncrypting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Encrypting with FHE...
                                                    </>
                                                ) : isCreateOrderPending ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Confirm in Wallet...
                                                    </>
                                                ) : isConfirmingOrder ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Confirming on Base Sepolia...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield className="mr-2 h-5 w-5" />
                                                        Create Shadow Order (0.0003 ETH)
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* ─── Side Panel ─── */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Lock className="h-5 w-5 text-primary" />
                                            How It Works
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-3 text-sm">
                                            {[
                                                {
                                                    s: "1",
                                                    t: "FHE Encryption",
                                                    d: "Your limit price and amount are encrypted in-browser using Inco\u2019s TFHE SDK",
                                                },
                                                {
                                                    s: "2",
                                                    t: "On-Chain Transaction",
                                                    d: "Encrypted ciphertext is sent to ShadowOrdersHook on Base Sepolia (0.0003 ETH fee)",
                                                },
                                                {
                                                    s: "3",
                                                    t: "Price Monitoring",
                                                    d: "Market price is tracked — when it reaches your limit, the keeper is triggered",
                                                },
                                                {
                                                    s: "4",
                                                    t: "MEV-Free Execution",
                                                    d: "Keeper executes the swap via Uniswap V4 pool — no front-running possible",
                                                },
                                            ].map(({ s, t, d }) => (
                                                <div key={s} className="flex items-start gap-3">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-xs font-bold text-primary">{s}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{t}</p>
                                                        <p className="text-muted-foreground">{d}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">
                                                Powered by{" "}
                                                <a href="https://www.inco.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                    Inco Network
                                                </a>{" "}
                                                TFHE
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {isConnected && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Your Balances</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {MOCK_TOKENS.map((token) => (
                                                    <TokenBalance key={token.symbol} token={token} address={address!} />
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

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
                                                {CONTRACTS.SHADOW_ORDERS_HOOK.slice(0, 6)}...{CONTRACTS.SHADOW_ORDERS_HOOK.slice(-4)}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Keeper</span>
                                            <a
                                                href={`https://sepolia.basescan.org/address/${CONTRACTS.KEEPER_ADDRESS}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-primary hover:underline"
                                            >
                                                {CONTRACTS.KEEPER_ADDRESS.slice(0, 6)}...{CONTRACTS.KEEPER_ADDRESS.slice(-4)}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Network</span>
                                            <span>Base Sepolia</span>
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

function TokenBalance({ token, address }: { token: TokenInfo; address: string }) {
    const { data: balance } = useReadContract({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
    });
    const formatted = balance ? Number(formatUnits(balance as bigint, token.decimals)).toFixed(4) : "0";
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
