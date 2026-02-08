import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const vs_currency = searchParams.get("vs_currency") || "usd";
        const order = searchParams.get("order") || "market_cap_desc";
        const per_page = searchParams.get("per_page") || "50";
        const page = searchParams.get("page") || "1";
        const ids = searchParams.get("ids") || "";

        const params = new URLSearchParams({
            vs_currency,
            order,
            per_page,
            page,
            sparkline: "false",
        });

        if (ids) {
            params.set("ids", ids);
        }

        const url = `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
            },
            next: { revalidate: 30 },
        });

        if (!response.ok) {
            console.error(`CoinGecko markets API error: ${response.status}`);
            return NextResponse.json([], { status: 200 });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Markets API error:", error);
        return NextResponse.json([], { status: 200 });
    }
}
