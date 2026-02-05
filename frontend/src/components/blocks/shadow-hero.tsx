"use client";

import Link from "next/link";
import { ArrowRight, Shield, Lock, Eye, Zap, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashedLine } from "@/components/dashed-line";
import { motion } from "framer-motion";

const features = [
    {
        title: "FHE Encrypted Orders",
        description: "Your limit prices and amounts are fully encrypted using Inco Network's FHE technology.",
        icon: Lock,
    },
    {
        title: "MEV Protection",
        description: "No one can see your order details - eliminating front-running and sandwich attacks.",
        icon: Eye,
    },
    {
        title: "Uniswap V4 Hooks",
        description: "Built on Uniswap V4's powerful hook system for seamless DEX integration.",
        icon: Zap,
    },
    {
        title: "Real-Time Execution",
        description: "Orders execute automatically when market conditions match your encrypted limits.",
        icon: TrendingUp,
    },
];

const stats = [
    { value: "4", label: "Trading Pairs" },
    { value: "100%", label: "Privacy" },
    { value: "0%", label: "Front-Running" },
    { value: "∞", label: "Possibilities" },
];

export const Hero = () => {
    return (
        <section className="relative overflow-hidden py-28 lg:py-32 lg:pt-44">
            {/* Background gradient */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-gradient-to-l from-blue-500/10 to-cyan-500/10 blur-3xl" />
            </div>

            <div className="container">
                <div className="mx-auto max-w-4xl text-center">
                    {/* Badge */}
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium">Live on Base Sepolia</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                        <span className="block">Trade with</span>
                        <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                            Complete Privacy
                        </span>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                        Shadow Orders brings fully homomorphic encryption to Uniswap V4.
                        Create limit orders where your price and amount remain invisible to everyone —
                        including validators, bots, and other traders.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button size="lg" asChild className="h-12 px-8 text-base">
                            <Link href="/trade">
                                Start Trading
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                            <Link href="/docs">
                                Read Documentation
                            </Link>
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl font-bold text-foreground sm:text-4xl">
                                    {stat.value}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mx-auto mt-24 max-w-5xl">
                    <DashedLine className="mb-16" />

                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={i}
                                    className="group relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
                                >
                                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mb-2 font-semibold">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* How It Works Preview */}
                <div className="mx-auto mt-24 max-w-4xl">
                    <div className="rounded-3xl border bg-card/50 p-8 backdrop-blur-sm lg:p-12">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold sm:text-3xl">How It Works</h2>
                            <p className="mt-2 text-muted-foreground">
                                Three simple steps to private trading
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-3">
                            <div className="relative text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                                    1
                                </div>
                                <h3 className="mb-2 font-semibold">Connect & Select</h3>
                                <p className="text-sm text-muted-foreground">
                                    Connect your wallet and choose a trading pair
                                </p>
                            </div>

                            <div className="relative text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                                    2
                                </div>
                                <h3 className="mb-2 font-semibold">Encrypt & Submit</h3>
                                <p className="text-sm text-muted-foreground">
                                    Your order is encrypted client-side before submission
                                </p>
                            </div>

                            <div className="relative text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                                    3
                                </div>
                                <h3 className="mb-2 font-semibold">Private Execution</h3>
                                <p className="text-sm text-muted-foreground">
                                    Order executes privately when conditions are met
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
