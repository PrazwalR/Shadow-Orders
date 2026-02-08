"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    ExternalLink,
    TrendingDown,
    TrendingUp,
    Eye,
    EyeOff,
    Shield,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/blocks/navbar";
import { ShadowFooter } from "@/components/blocks/shadow-footer";
import { useOrderTracking } from "@/contexts/order-tracking-context";
import { TOKENS } from "@/config/contracts";

export default function OrdersPage() {
    const { isConnected } = useAccount();
    const { orders, clearOrders } = useOrderTracking();
    const [showEncrypted, setShowEncrypted] = useState<{ [key: string]: boolean }>({});

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
            case "executing":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Executing...</Badge>;
            case "executed":
                return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Executed</Badge>;
            case "failed":
                return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Failed</Badge>;
            default:
                return null;
        }
    };

    const calculateProgress = (order: typeof orders[0]) => {
        if (order.status === "executed") return 100;
        if (order.status === "failed") return 0;
        const totalDistance = Math.abs(order.startPrice - order.limitPrice);
        const currentDistance = Math.abs(order.currentSimulatedPrice - order.limitPrice);
        return Math.min(100, Math.max(0, ((totalDistance - currentDistance) / totalDistance) * 100));
    };

    const toggleEncrypted = (orderId: string) => {
        setShowEncrypted(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const formatNumber = (num: number) => {
        if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (num >= 100) return num.toFixed(2);
        if (num >= 1) return num.toFixed(4);
        if (num >= 0.01) return num.toFixed(6);
        return num.toFixed(8);
    };

    const formatPriceDisplay = (price: number, fromToken: string, toToken: string) => {
        if (price < 0.01) {
            const inv = 1 / price;
            return { value: formatNumber(inv), label: `${fromToken}/${toToken}`, subtitle: `(1 ${toToken} = ${formatNumber(inv)} ${fromToken})` };
        }
        return { value: formatNumber(price), label: `${toToken}/${fromToken}`, subtitle: `(1 ${fromToken} = ${formatNumber(price)} ${toToken})` };
    };

    const formatAmount = (amount: string | number) => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(num)) return String(amount);
        return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });
    };

    const getTokenIcon = (symbol: string) => {
        const token = Object.values(TOKENS).find(t => t.symbol === symbol);
        return token?.icon || "🪙";
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background pt-20">
                <div className="container py-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Shield className="h-8 w-8 text-primary" />
                                My Shadow Orders
                            </h1>
                            <p className="text-muted-foreground mt-1">Track your encrypted limit orders</p>
                        </div>
                        {orders.length > 0 && (
                            <Button variant="outline" size="sm" onClick={clearOrders} className="text-xs">Clear All</Button>
                        )}
                    </div>

                    {/* Orders List */}
                    {!isConnected ? (
                        <Card className="p-12 text-center">
                            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                            <p className="text-muted-foreground">Connect your wallet to view your shadow orders</p>
                        </Card>
                    ) : orders.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                            <p className="text-muted-foreground mb-4">Create your first encrypted limit order to get started</p>
                            <Button asChild><a href="/trade">Create Order</a></Button>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const progress = calculateProgress(order);
                                const isPriceDropping = order.startPrice > order.limitPrice;
                                const isEncryptedVisible = showEncrypted[order.orderId];

                                return (
                                    <Card key={order.orderId} className="overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-2xl">{getTokenIcon(order.fromToken)}</span>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-2xl">{getTokenIcon(order.toToken)}</span>
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">{order.fromToken} → {order.toToken}</CardTitle>
                                                        <CardDescription>{formatAmount(order.amount)} {order.fromToken}</CardDescription>
                                                    </div>
                                                </div>
                                                {getStatusBadge(order.status)}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Price Visualization */}
                                            <div className="bg-muted/30 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        {isPriceDropping ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                                                        <span className="text-sm font-medium">Price Progress</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => toggleEncrypted(order.orderId)} className="h-8 text-xs gap-1">
                                                        {isEncryptedVisible ? <><EyeOff className="h-3 w-3" />Hide Limit</> : <><Eye className="h-3 w-3" />Reveal Limit</>}
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    {(() => {
                                                        const startDisplay = formatPriceDisplay(order.startPrice, order.fromToken, order.toToken);
                                                        const targetDisplay = formatPriceDisplay(order.limitPrice, order.fromToken, order.toToken);
                                                        const currentDisplay = formatPriceDisplay(order.currentSimulatedPrice, order.fromToken, order.toToken);

                                                        return (
                                                            <>
                                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                                    <span>Start: {startDisplay.value} {startDisplay.label}</span>
                                                                    <span>
                                                                        Target: {isEncryptedVisible ? (
                                                                            <span className="text-primary font-mono">{targetDisplay.value} {targetDisplay.label}</span>
                                                                        ) : (
                                                                            <span className="font-mono bg-muted px-2 py-0.5 rounded">🔒 Encrypted</span>
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <Progress value={progress} className="h-3" />

                                                                {order.status === "pending" && (
                                                                    <div className="flex flex-col items-center gap-1 mt-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm text-muted-foreground">Current:</span>
                                                                            <span className={`text-xl font-bold font-mono ${isPriceDropping ? "text-red-500" : "text-green-500"}`}>
                                                                                {currentDisplay.value}
                                                                            </span>
                                                                            <span className="text-sm text-muted-foreground">{currentDisplay.label}</span>
                                                                            {isPriceDropping ? <TrendingDown className="h-4 w-4 text-red-500 animate-pulse" /> : <TrendingUp className="h-4 w-4 text-green-500 animate-pulse" />}
                                                                        </div>
                                                                        <span className="text-xs text-muted-foreground">{currentDisplay.subtitle}</span>
                                                                    </div>
                                                                )}

                                                                {order.status === "executing" && (
                                                                    <div className="flex items-center justify-center gap-2 mt-3 text-blue-500">
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        <span className="text-sm font-medium">Keeper executing swap on-chain...</span>
                                                                    </div>
                                                                )}

                                                                {order.status === "executed" && (
                                                                    <div className="flex flex-col items-center gap-1 mt-3 text-green-500">
                                                                        <div className="flex items-center gap-2">
                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                            <span className="text-sm font-medium">Executed at {targetDisplay.value} {targetDisplay.label}</span>
                                                                        </div>
                                                                        <span className="text-xs text-muted-foreground">{targetDisplay.subtitle}</span>
                                                                    </div>
                                                                )}

                                                                {order.status === "failed" && (
                                                                    <div className="flex items-center justify-center gap-2 mt-3 text-red-500">
                                                                        <XCircle className="h-4 w-4" />
                                                                        <span className="text-sm font-medium">Execution failed — will retry</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Order Details */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Order ID</span>
                                                    <p className="font-mono text-xs truncate">{order.orderId.slice(0, 10)}...</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Created</span>
                                                    <p>{new Date(order.createdAt).toLocaleTimeString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Type</span>
                                                    <p>{isPriceDropping ? "Buy (Limit)" : "Sell (Limit)"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Privacy</span>
                                                    <p className="flex items-center gap-1"><Shield className="h-3 w-3 text-primary" />FHE Encrypted</p>
                                                </div>
                                            </div>

                                            {/* Transaction Links */}
                                            {(order.txHash || order.executionTxHash) && (
                                                <div className="flex gap-2 pt-2 border-t flex-wrap">
                                                    {order.txHash && (
                                                        <Button variant="outline" size="sm" asChild className="text-xs">
                                                            <a href={`https://sepolia.basescan.org/tx/${order.txHash}`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-3 w-3 mr-1" />Order TX (FHE)
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {order.executionTxHash && (
                                                        <Button variant="outline" size="sm" asChild className="text-xs">
                                                            <a href={`https://sepolia.basescan.org/tx/${order.executionTxHash}`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-3 w-3 mr-1" />Swap TX
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Stats */}
                    {orders.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                            <Card className="p-4 text-center">
                                <p className="text-2xl font-bold">{orders.length}</p>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-500">{orders.filter(o => o.status === "pending").length}</p>
                                <p className="text-sm text-muted-foreground">Pending</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-2xl font-bold text-blue-500">{orders.filter(o => o.status === "executing").length}</p>
                                <p className="text-sm text-muted-foreground">Executing</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-2xl font-bold text-green-500">{orders.filter(o => o.status === "executed").length}</p>
                                <p className="text-sm text-muted-foreground">Executed</p>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
            <ShadowFooter />
        </>
    );
}
