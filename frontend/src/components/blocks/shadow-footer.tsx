"use client";

import Link from "next/link";
import { Github, Twitter, FileText, ExternalLink } from "lucide-react";

const navigation = {
    product: [
        { name: "Trade", href: "/trade" },
        { name: "Markets", href: "/markets" },
        { name: "Faucet", href: "/faucet" },
        { name: "Documentation", href: "/docs" },
    ],
    technology: [
        { name: "Uniswap V4", href: "https://docs.uniswap.org/contracts/v4/overview", external: true },
        { name: "Inco Network", href: "https://www.inco.org/", external: true },
        { name: "FHE Technology", href: "https://fhe.org/", external: true },
        { name: "Base Network", href: "https://base.org/", external: true },
    ],
    resources: [
        { name: "GitHub", href: "https://github.com", external: true },
        { name: "Block Explorer", href: "https://sepolia.basescan.org", external: true },
        { name: "Whitepaper", href: "#", external: false },
        { name: "Blog", href: "#", external: false },
    ],
};

export const ShadowFooter = () => {
    return (
        <footer className="border-t bg-muted/30">
            <div className="container py-16">
                <div className="grid gap-8 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                                <span className="text-lg font-bold text-primary-foreground">S</span>
                            </div>
                            <span className="text-xl font-bold">Shadow Orders</span>
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                            Private limit orders on Uniswap V4 using Fully Homomorphic Encryption.
                            Trade without exposing your strategy.
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Github className="h-5 w-5" />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <FileText className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="grid grid-cols-3 gap-8 lg:col-span-3">
                        <div>
                            <h3 className="font-semibold mb-4">Product</h3>
                            <ul className="space-y-3">
                                {navigation.product.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4">Technology</h3>
                            <ul className="space-y-3">
                                {navigation.technology.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            target={item.external ? "_blank" : undefined}
                                            rel={item.external ? "noopener noreferrer" : undefined}
                                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {item.name}
                                            {item.external && <ExternalLink className="h-3 w-3" />}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4">Resources</h3>
                            <ul className="space-y-3">
                                {navigation.resources.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            target={item.external ? "_blank" : undefined}
                                            rel={item.external ? "noopener noreferrer" : undefined}
                                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {item.name}
                                            {item.external && <ExternalLink className="h-3 w-3" />}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Shadow Orders. Built for Hookathon.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Base Sepolia Testnet</span>
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            Network Active
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
