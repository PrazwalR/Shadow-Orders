import {
  ArrowRight,
  Lock,
  Shield,
  Eye,
  Zap,
} from "lucide-react";

import { DashedLine } from "@/components/dashed-line";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "TEE Encrypted Orders",
    description: "Your limit prices and amounts are encrypted using Inco Lightning SDK with Trusted Execution Environments.",
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
    title: "Complete Privacy",
    description: "Trade without exposing your strategy to validators, bots, or other traders.",
    icon: Shield,
  },
];

export const Hero = () => {
  return (
    <section className="py-28 lg:py-32 lg:pt-44">
      <div className="container flex flex-col justify-between gap-8 md:gap-14 lg:flex-row lg:gap-20">
        {/* Left side - Main content */}
        <div className="flex-1">
          <div className="max-w-160 overflow-hidden">
            <img src="/logo.png" alt="Shadow Orders" className="h-32 w-auto md:h-40 lg:h-48 object-cover object-center" />
          </div>

          <p className="text-muted-foreground text-1xl mt-5 md:text-3xl">
            Private limit orders on Uniswap V4 using Inco Lightning (TEE).
            Trade without revealing your strategy.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4 lg:flex-nowrap">
            <Button asChild>
              <a href="/trade">
                Start Trading
              </a>
            </Button>
            <Button
              variant="outline"
              className="from-background h-auto gap-2 bg-linear-to-r to-transparent shadow-md"
              asChild
            >
              <a
                href="/docs"
                className="max-w-56 truncate text-start md:max-w-none"
              >
                Read Documentation
                <ArrowRight className="stroke-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Right side - Features */}
        <div className="relative flex flex-1 flex-col justify-center space-y-5 max-lg:pt-10 lg:pl-10">
          <DashedLine
            orientation="vertical"
            className="absolute top-0 left-0 max-lg:hidden"
          />
          <DashedLine
            orientation="horizontal"
            className="absolute top-0 lg:hidden"
          />
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-2.5 lg:gap-5">
                <Icon className="text-foreground mt-1 size-4 shrink-0 lg:size-5" />
                <div>
                  <h2 className="font-text text-foreground font-semibold">
                    {feature.title}
                  </h2>
                  <p className="text-muted-foreground max-w-76 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 max-lg:ml-6 max-lg:h-[550px] max-lg:overflow-hidden md:mt-20 lg:container lg:mt-24">
        <div className="relative h-[793px] w-full rounded-2xl overflow-hidden border border-border max-lg:rounded-tr-none bg-muted/30">
          {/* Simple gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-background" />

          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

          {/* Content */}
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center space-y-8 px-4">
              <div className="space-y-4">
                <h2 className="text-6xl md:text-8xl font-bold tracking-tight">
                  Privacy Preserving DEX
                </h2>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                  Trade with encrypted limit orders on Uniswap V4
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base text-muted-foreground">
                <span>Powered by</span>
                <span className="font-semibold text-foreground">Uniswap V4</span>
                <span>×</span>
                <span className="font-semibold text-foreground">Inco Lightning</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
