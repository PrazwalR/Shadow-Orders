import { NextResponse } from "next/server";

export const revalidate = 30;

const FALLBACK_PRICES: Record<string, { usd: number }> = {
    "usd-coin": { usd: 1 },
    dai: { usd: 1 },
    "wrapped-bitcoin": { usd: 97000 },
    ethereum: { usd: 3200 },
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const ids = searchParams.get("ids") || "ethereum,usd-coin,dai,wrapped-bitcoin";
        const vs_currencies = searchParams.get("vs_currencies") || "usd";

        const params = new URLSearchParams({
            ids,
            vs_currencies,
        });

        const url = `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
            },
            next: { revalidate: 30 },
        });

        if (!response.ok) {
            console.error(`CoinGecko prices API error: ${response.status}`);
            return NextResponse.json(FALLBACK_PRICES, { status: 200 });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Prices API error:", error);
        return NextResponse.json(FALLBACK_PRICES, { status: 200 });
    }
}
