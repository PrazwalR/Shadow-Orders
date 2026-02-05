"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { Droplets, Loader2, Check, ExternalLink, Coins, AlertCircle, Plus, Wallet } from "lucide-react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navbar } from "@/components/blocks/navbar";
import { ShadowFooter } from "@/components/blocks/shadow-footer";
import { MOCK_TOKENS } from "@/config/contracts";
import { ERC20_ABI } from "@/config/abis";
import { cn } from "@/lib/utils";

const FAUCET_AMOUNTS: Record<string, string[]> = {
    mUSDC: ["100", "1000", "10000"],
    mDAI: ["100", "1000", "10000"],
    mWBTC: ["0.1", "1", "10"],
    mWETH: ["1", "10", "100"],
};

// Add token to MetaMask
async function addTokenToWallet(token: typeof MOCK_TOKENS[number]) {
    if (typeof window === "undefined" || !window.ethereum) return false;

    try {
        const wasAdded = await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
                type: "ERC20",
                options: {
                    address: token.address,
                    symbol: token.symbol,
                    decimals: token.decimals,
                    // image: token.icon, // Can add image URL if available
                },
            },
        });
        return wasAdded;
    } catch (error) {
        console.error("Error adding token to wallet:", error);
        return false;
    }
}

export default function FaucetPage() {
    const { address, isConnected } = useAccount();
    const [selectedToken, setSelectedToken] = useState<string>("mUSDC");
    const [customAmount, setCustomAmount] = useState<string>("");
    const [mintAmount, setMintAmount] = useState<string>("1000");

    const token = MOCK_TOKENS.find((t) => t.symbol === selectedToken);

    const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleMint = () => {
        if (!token || !address) return;

        const amount = customAmount || mintAmount;
        const amountInWei = parseUnits(amount, token.decimals);

        writeContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "mint",
            args: [address, amountInWei],
        });
    };

    const handleSelectAmount = (amount: string) => {
        setMintAmount(amount);
        setCustomAmount("");
    };

    const handleTokenChange = (value: string) => {
        setSelectedToken(value);
        reset();
        setCustomAmount("");
        setMintAmount(FAUCET_AMOUNTS[value]?.[1] || "1000");
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background pt-20">
                <div className="container py-8 md:py-16">
                    {/* Header */}
                    <div className="mx-auto max-w-2xl text-center mb-12">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                            <Droplets className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold sm:text-4xl">Token Faucet</h1>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Get free testnet tokens to try out Shadow Orders on Base Sepolia
                        </p>
                    </div>

                    <div className="mx-auto max-w-lg">
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Coins className="h-5 w-5" />
                                    Mint Mock Tokens
                                </CardTitle>
                                <CardDescription>
                                    Select a token and amount to mint to your wallet
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {!isConnected ? (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Please connect your wallet to use the faucet
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <>
                                        {/* Token Selection */}
                                        <div className="space-y-2">
                                            <Label>Select Token</Label>
                                            <Select value={selectedToken} onValueChange={handleTokenChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a token" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {MOCK_TOKENS.map((t) => (
                                                        <SelectItem key={t.symbol} value={t.symbol}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">{t.icon}</span>
                                                                <span className="font-medium">{t.symbol}</span>
                                                                <span className="text-muted-foreground">
                                                                    ({t.decimals} decimals)
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Quick Amounts */}
                                        <div className="space-y-2">
                                            <Label>Quick Amounts</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {FAUCET_AMOUNTS[selectedToken]?.map((amount) => (
                                                    <Button
                                                        key={amount}
                                                        variant={mintAmount === amount && !customAmount ? "default" : "outline"}
                                                        className="w-full"
                                                        onClick={() => handleSelectAmount(amount)}
                                                    >
                                                        {amount} {selectedToken}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Custom Amount */}
                                        <div className="space-y-2">
                                            <Label htmlFor="custom-amount">Custom Amount</Label>
                                            <Input
                                                id="custom-amount"
                                                type="number"
                                                placeholder={`Enter amount of ${selectedToken}`}
                                                value={customAmount}
                                                onChange={(e) => setCustomAmount(e.target.value)}
                                                min="0"
                                                step="any"
                                            />
                                        </div>

                                        {/* Token Info */}
                                        {token && (
                                            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Token Address</span>
                                                    <a
                                                        href={`https://sepolia.basescan.org/address/${token.address}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-primary hover:underline"
                                                    >
                                                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Amount to Mint</span>
                                                    <span className="font-medium">
                                                        {customAmount || mintAmount} {selectedToken}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Network</span>
                                                    <span className="font-medium">Base Sepolia</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Error Message */}
                                        {writeError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    {writeError.message.includes("User rejected")
                                                        ? "Transaction was rejected"
                                                        : "Failed to mint tokens. Please try again."}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Success Message */}
                                        {isSuccess && hash && (
                                            <Alert className="border-green-500 bg-green-500/10">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <AlertDescription className="text-green-600">
                                                    Tokens minted successfully!{" "}
                                                    <a
                                                        href={`https://sepolia.basescan.org/tx/${hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="underline"
                                                    >
                                                        View transaction
                                                    </a>
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Mint Button */}
                                        <Button
                                            className="w-full h-12 text-base"
                                            onClick={handleMint}
                                            disabled={isPending || isConfirming || (!customAmount && !mintAmount)}
                                        >
                                            {isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Confirm in Wallet...
                                                </>
                                            ) : isConfirming ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Minting...
                                                </>
                                            ) : (
                                                <>
                                                    <Droplets className="mr-2 h-4 w-4" />
                                                    Mint {customAmount || mintAmount} {selectedToken}
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Token List */}
                        <div className="mt-8">
                            <h2 className="text-xl font-semibold mb-4">Available Tokens</h2>
                            <div className="grid gap-3">
                                {MOCK_TOKENS.map((t) => (
                                    <div
                                        key={t.symbol}
                                        className={cn(
                                            "flex items-center justify-between rounded-lg border p-4 transition-colors",
                                            selectedToken === t.symbol && "border-primary bg-primary/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{t.icon}</span>
                                            <div>
                                                <p className="font-medium">{t.symbol}</p>
                                                <p className="text-sm text-muted-foreground">{t.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1"
                                                onClick={() => addTokenToWallet(t)}
                                            >
                                                <Plus className="h-3 w-3" />
                                                <Wallet className="h-3 w-3" />
                                                Add to Wallet
                                            </Button>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">
                                                    {t.decimals} decimals
                                                </p>
                                                <a
                                                    href={`https://sepolia.basescan.org/address/${t.address}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    View on Explorer
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="mt-8 rounded-lg border bg-muted/30 p-6">
                            <h3 className="font-semibold mb-3">How to use the faucet</h3>
                            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                                <li>Connect your wallet using the button in the navigation</li>
                                <li>Make sure you're on the Base Sepolia network</li>
                                <li>Select the token you want to mint</li>
                                <li>Choose a quick amount or enter a custom amount</li>
                                <li>Click "Mint" and confirm the transaction in your wallet</li>
                                <li>Tokens will be sent directly to your connected wallet</li>
                            </ol>
                            <p className="mt-4 text-sm text-muted-foreground">
                                💡 <strong>Tip:</strong> You'll also need Base Sepolia ETH for gas fees.{" "}
                                <a
                                    href="https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Get some here
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <ShadowFooter />
        </>
    );
}
