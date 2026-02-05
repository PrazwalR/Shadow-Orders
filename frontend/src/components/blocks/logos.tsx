import Image from "next/image";
import Link from "next/link";

import Marquee from "react-fast-marquee";

import { cn } from "@/lib/utils";

type Company = {
  name: string;
  logo: string;
  width: number;
  height: number;
  href: string;
};

export const Logos = () => {
  const topRowCompanies = [
    {
      name: "Uniswap",
      logo: "/logos/uniswap.svg",
      width: 143,
      height: 26,
      href: "https://uniswap.org",
    },
    {
      name: "Inco",
      logo: "/logos/inco.svg",
      width: 100,
      height: 31,
      href: "https://inco.org",
    },
    {
      name: "CoinGecko",
      logo: "/logos/coingecko.svg",
      width: 160,
      height: 22,
      href: "https://coingecko.com",
    },
    {
      name: "Base",
      logo: "/logos/base.svg",
      width: 100,
      height: 27,
      href: "https://base.org",
    },
  ];

  const bottomRowCompanies = [
    {
      name: "Ethereum",
      logo: "/logos/ethereum.svg",
      width: 141,
      height: 32,
      href: "https://ethereum.org",
    },
    {
      name: "Viem",
      logo: "/logos/viem.svg",
      width: 90,
      height: 18,
      href: "https://viem.sh",
    },
    {
      name: "Wagmi",
      logo: "/logos/wagmi.svg",
      width: 105,
      height: 28,
      href: "https://wagmi.sh",
    },
    {
      name: "Next.js",
      logo: "/logos/nextjs.svg",
      width: 128,
      height: 33,
      href: "https://nextjs.org",
    },
    {
      name: "FHE",
      logo: "/logos/fhe.svg",
      width: 70,
      height: 28,
      href: "https://fhe.org",
    },
  ];

  return (
    <section className="pb-28 lg:pb-32 overflow-hidden">
      <div className="container space-y-10 lg:space-y-16">
        <div className="text-center">
          <h2 className="mb-4 text-xl text-balance md:text-2xl lg:text-3xl">
            Built with cutting-edge technology.
            <br className="max-md:hidden" />
            <span className="text-muted-foreground">
              Powered by Uniswap V4 Hooks and Inco FHE.
            </span>
          </h2>
        </div>

        <div className="flex w-full flex-col items-center gap-8">
          {/* Top row - 4 logos */}
          <LogoRow companies={topRowCompanies} gridClassName="grid-cols-4" />

          {/* Bottom row - 5 logos */}
          <LogoRow
            companies={bottomRowCompanies}
            gridClassName="grid-cols-5"
            direction="right"
          />
        </div>
      </div>
    </section>
  );
};

type LogoRowProps = {
  companies: Company[];
  gridClassName: string;
  direction?: "left" | "right";
};

const LogoRow = ({ companies, gridClassName, direction }: LogoRowProps) => {
  return (
    <>
      {/* Desktop static version */}
      <div className="hidden md:block">
        <div
          className={cn(
            "grid items-center justify-items-center gap-x-20 lg:gap-x-28",
            gridClassName,
          )}
        >
          {companies.map((company, index) => (
            <Link href={company.href} target="_blank" key={index}>
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                width={company.width}
                height={company.height}
                className="dark:opacity/100 object-contain opacity-50 transition-opacity hover:opacity-70 dark:invert"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile marquee version */}
      <div className="md:hidden">
        <Marquee direction={direction} pauseOnHover>
          {companies.map((company, index) => (
            <Link
              href={company.href}
              target="_blank"
              key={index}
              className="mx-8 inline-block transition-opacity hover:opacity-70"
            >
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                width={company.width}
                height={company.height}
                className="object-contain"
              />
            </Link>
          ))}
        </Marquee>
      </div>
    </>
  );
};
