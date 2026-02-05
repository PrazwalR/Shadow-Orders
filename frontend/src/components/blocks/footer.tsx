import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Footer() {
  const navigation = [
    { name: "Trade", href: "/trade" },
    { name: "Markets", href: "/markets" },
    { name: "Faucet", href: "/faucet" },
    { name: "Docs", href: "/docs" },
  ];

  const social = [
    { name: "GitHub", href: "https://github.com" },
    { name: "Twitter", href: "https://x.com" },
  ];

  const legal = [{ name: "Built for Hookathon 2024", href: "#" }];

  return (
    <footer className="flex flex-col items-center gap-14 pt-28 lg:pt-32">
      <div className="container space-y-3 text-center">
        <h2 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
          Start trading privately today
        </h2>
        <p className="text-muted-foreground mx-auto max-w-xl leading-snug text-balance">
          Shadow Orders brings privacy-preserving limit orders to DeFi using
          Uniswap V4 Hooks and Inco FHE encryption.
        </p>
        <div>
          <Button size="lg" className="mt-4" asChild>
            <Link href="/trade">Launch App</Link>
          </Button>
        </div>
      </div>

      <nav className="container flex flex-col items-center gap-4">
        <ul className="flex flex-wrap items-center justify-center gap-6">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="font-medium transition-opacity hover:opacity-75"
              >
                {item.name}
              </Link>
            </li>
          ))}
          {social.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-0.5 font-medium transition-opacity hover:opacity-75"
              >
                {item.name} <ArrowUpRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap items-center justify-center gap-6">
          {legal.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="text-muted-foreground text-sm transition-opacity hover:opacity-75"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="text-primary mt-10 w-full md:mt-14 lg:mt-20">
        <svg
          width="1570"
          height="293"
          viewBox="0 0 1570 293"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <text
            x="50%"
            y="280"
            textAnchor="middle"
            fill="url(#paint0_linear_shadow)"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="280"
            fontWeight="bold"
          >
            Shadow Orders
          </text>
          <defs>
            <linearGradient
              id="paint0_linear_shadow"
              x1="742.5"
              y1="0"
              x2="742.5"
              y2="218.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="currentColor" />
              <stop offset="1" stopColor="#F8F8F8" stopOpacity="0.41" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </footer>
  );
}
