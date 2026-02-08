"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Shield, TrendingUp, Menu, X, Wallet, ClipboardList } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    label: "Trade",
    href: "/trade",
    dropdownItems: [
      {
        title: "Shadow Orders",
        href: "/trade",
        description: "Create encrypted limit orders with FHE privacy",
        icon: Shield,
      },
      {
        title: "My Orders",
        href: "/orders",
        description: "Track your pending and executed orders",
        icon: ClipboardList,
      },
      {
        title: "Markets",
        href: "/markets",
        description: "View live market data and trading pairs",
        icon: TrendingUp,
      },
    ],
  },
  { label: "My Orders", href: "/orders" },
  { label: "Faucet", href: "/faucet" },
  { label: "Docs", href: "/docs" },
];

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "bg-background/80 fixed left-1/2 z-50 w-[min(95%,1200px)] -translate-x-1/2 rounded-2xl border backdrop-blur-xl transition-all duration-300",
        "top-4 lg:top-6",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Shadow Orders</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="max-lg:hidden">
          <NavigationMenuList className="gap-1">
            {ITEMS.map((link) =>
              link.dropdownItems ? (
                <NavigationMenuItem key={link.label}>
                  <NavigationMenuTrigger className="data-[state=open]:bg-accent/50 bg-transparent px-3 text-sm font-medium">
                    {link.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="w-[350px] space-y-1 p-3">
                      {link.dropdownItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.title}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={item.href}
                                className="group hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-start gap-3 rounded-lg p-3 leading-none no-underline outline-hidden transition-all select-none"
                              >
                                <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                                  <Icon className="text-primary h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium leading-none">
                                    {item.title}
                                  </div>
                                  <p className="text-muted-foreground line-clamp-2 text-xs">
                                    {item.description}
                                  </p>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      "bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:text-foreground/80",
                      pathname === link.href
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuItem>
              ),
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="max-lg:hidden">
            <ConnectButton
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden relative flex h-10 w-10 items-center justify-center rounded-lg border"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300",
          isMenuOpen ? "max-h-[500px] border-t" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 p-4">
          {ITEMS.map((link) =>
            link.dropdownItems ? (
              <div key={link.label}>
                <button
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === link.label ? null : link.label,
                    )
                  }
                  className="flex w-full items-center justify-between rounded-lg p-3 text-sm font-medium hover:bg-accent"
                >
                  {link.label}
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openDropdown === link.label && "rotate-90",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    openDropdown === link.label
                      ? "max-h-[200px] opacity-100"
                      : "max-h-0 opacity-0",
                  )}
                >
                  <div className="space-y-1 pl-4">
                    {link.dropdownItems.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="block rounded-lg p-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "rounded-lg p-3 text-sm font-medium hover:bg-accent",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ),
          )}
          <div className="mt-4 border-t pt-4">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openConnectModal,
                mounted,
              }) => {
                const connected = mounted && account && chain;
                return (
                  <Button
                    onClick={connected ? openAccountModal : openConnectModal}
                    className="w-full"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {connected ? account.displayName : "Connect Wallet"}
                  </Button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </nav>
      </div>
    </header>
  );
};
