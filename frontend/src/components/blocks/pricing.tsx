"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const pools = [
  {
    name: "USDC/WETH",
    fee: "0.3%",
    description: "Stablecoin to ETH",
    features: [
      "High liquidity",
      "Low slippage",
      "Best for USD trades",
      "Encrypted limit orders",
    ],
  },
  {
    name: "WETH/DAI",
    fee: "0.3%",
    features: [
      "DAI stablecoin pair",
      "Deep liquidity",
      "Popular trading pair",
      "FHE protected",
      "MEV resistant",
    ],
  },
  {
    name: "WBTC/WETH",
    fee: "0.3%",
    features: [
      "BTC to ETH trades",
      "Cross-asset swaps",
      "Privacy preserved",
      "No front-running",
    ],
  },
];

export const Pricing = ({ className }: { className?: string }) => {
  return (
    <section className={cn("py-28 lg:py-32", className)}>
      <div className="container max-w-5xl">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
            Trading Pools
          </h2>
          <p className="text-muted-foreground mx-auto max-w-xl leading-snug text-balance">
            Trade on Uniswap V4 pools with encrypted limit orders. All pools
            feature FHE protection and MEV resistance powered by Inco Network.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-5 text-start md:mt-12 md:grid-cols-3 lg:mt-20">
          {pools.map((pool) => (
            <Card
              key={pool.name}
              className={`${pool.name === "WETH/DAI"
                  ? "outline-primary origin-top outline-4"
                  : ""
                }`}
            >
              <CardContent className="flex flex-col gap-7 px-6 py-5">
                <div className="space-y-2">
                  <h3 className="text-foreground font-semibold">{pool.name}</h3>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-lg font-medium">
                      {pool.fee} fee{" "}
                      {pool.description && (
                        <span className="text-muted-foreground text-sm">
                          • {pool.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {pool.features.map((feature) => (
                    <div
                      key={feature}
                      className="text-muted-foreground flex items-center gap-1.5"
                    >
                      <Check className="size-5 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-fit"
                  variant={pool.name === "WETH/DAI" ? "default" : "outline"}
                  asChild
                >
                  <Link href="/trade">Trade Now</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
