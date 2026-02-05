"use client";

import { http, WagmiProvider, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, connectorsForWallets, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { coinbaseWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useState } from "react";
import { useTheme } from "next-themes";

// Setup wallet connectors - injectedWallet detects MetaMask and other browser extensions
const connectors = connectorsForWallets(
    [
        {
            groupName: "Recommended",
            wallets: [
                injectedWallet,
                coinbaseWallet,
            ],
        },
    ],
    {
        appName: "Shadow Orders",
        projectId: "demo",
    }
);

// Configure wagmi with direct wallet support
const config = createConfig({
    connectors,
    chains: [baseSepolia],
    transports: {
        [baseSepolia.id]: http("https://sepolia.base.org"),
    },
    ssr: true,
});

interface Web3ProviderProps {
    children: ReactNode;
}

function RainbowKitThemeWrapper({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme();

    return (
        <RainbowKitProvider
            theme={resolvedTheme === "dark" ? darkTheme({
                accentColor: "#8b5cf6",
                accentColorForeground: "white",
                borderRadius: "large",
            }) : lightTheme({
                accentColor: "#8b5cf6",
                accentColorForeground: "white",
                borderRadius: "large",
            })}
            modalSize="compact"
        >
            {children}
        </RainbowKitProvider>
    );
}

export function Web3Provider({ children }: Web3ProviderProps) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitThemeWrapper>
                    {children}
                </RainbowKitThemeWrapper>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
