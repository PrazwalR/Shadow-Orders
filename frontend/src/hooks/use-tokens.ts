"use client";

import { useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";

import { CONTRACTS } from "@/config/contracts";
import { ERC20_ABI } from "@/config/abis";
import { useAppStore } from "@/store/app-store";

export function useTokenBalances() {
    const { address, isConnected } = useAccount();
    const { setBalances } = useAppStore();

    // Read balance for each token
    const { data: usdcBalance } = useReadContract({
        address: CONTRACTS.MOCK_USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: daiBalance } = useReadContract({
        address: CONTRACTS.MOCK_DAI,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: wbtcBalance } = useReadContract({
        address: CONTRACTS.MOCK_WBTC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: wethBalance } = useReadContract({
        address: CONTRACTS.MOCK_WETH,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    useEffect(() => {
        if (!isConnected || !address) {
            setBalances({});
            return;
        }

        const newBalances: Record<string, { address: string; symbol: string; balance: bigint; decimals: number }> = {};

        if (usdcBalance !== undefined) {
            newBalances[CONTRACTS.MOCK_USDC] = {
                address: CONTRACTS.MOCK_USDC,
                symbol: "mUSDC",
                balance: usdcBalance,
                decimals: 6,
            };
        }

        if (daiBalance !== undefined) {
            newBalances[CONTRACTS.MOCK_DAI] = {
                address: CONTRACTS.MOCK_DAI,
                symbol: "mDAI",
                balance: daiBalance,
                decimals: 18,
            };
        }

        if (wbtcBalance !== undefined) {
            newBalances[CONTRACTS.MOCK_WBTC] = {
                address: CONTRACTS.MOCK_WBTC,
                symbol: "mWBTC",
                balance: wbtcBalance,
                decimals: 8,
            };
        }

        if (wethBalance !== undefined) {
            newBalances[CONTRACTS.MOCK_WETH] = {
                address: CONTRACTS.MOCK_WETH,
                symbol: "mWETH",
                balance: wethBalance,
                decimals: 18,
            };
        }

        setBalances(newBalances);
    }, [isConnected, address, usdcBalance, daiBalance, wbtcBalance, wethBalance, setBalances]);

    return {
        isLoading: !isConnected,
    };
}
