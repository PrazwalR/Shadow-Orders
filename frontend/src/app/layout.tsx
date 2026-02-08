import { Inter } from "next/font/google";
import localFont from "next/font/local";

import type { Metadata } from "next";

import { StyleGlideProvider } from "@/components/styleglide-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3Provider } from "@/providers/web3-provider";
import { OrderTrackingProvider } from "@/contexts/order-tracking-context";
import { SwapExecutor } from "@/components/swap-executor";
import "@/styles/globals.css";

const dmSans = localFont({
  src: [
    {
      path: "../../fonts/dm-sans/DMSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../fonts/dm-sans/DMSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Shadow Orders - Private Limit Orders on Uniswap V4",
    template: "%s | Shadow Orders",
  },
  description:
    "Create fully encrypted limit orders on Uniswap V4 using Inco Network's FHE technology. Trade with complete privacy - no MEV, no front-running.",
  keywords: [
    "Uniswap V4",
    "FHE",
    "Fully Homomorphic Encryption",
    "Inco Network",
    "DeFi",
    "DEX",
    "Limit Orders",
    "MEV Protection",
    "Privacy",
    "Ethereum",
    "Base",
  ],
  authors: [{ name: "Shadow Orders" }],
  creator: "Shadow Orders",
  publisher: "Shadow Orders",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon.ico" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/favicon/favicon.ico" }],
  },
  openGraph: {
    title: "Shadow Orders - Private Limit Orders on Uniswap V4",
    description:
      "Create fully encrypted limit orders on Uniswap V4 using Inco Network's FHE technology. Trade with complete privacy.",
    siteName: "Shadow Orders",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Shadow Orders - Private Limit Orders on Uniswap V4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadow Orders - Private Limit Orders on Uniswap V4",
    description:
      "Create fully encrypted limit orders on Uniswap V4 using Inco Network's FHE technology. Trade with complete privacy.",
    images: ["/og-image.jpg"],
    creator: "@shadoworders",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
        />
      </head>
      <body className={`${dmSans.variable} ${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>
            <OrderTrackingProvider>
              <SwapExecutor />
              <StyleGlideProvider />
              <main className="">{children}</main>
            </OrderTrackingProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
