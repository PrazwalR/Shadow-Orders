import Image from "next/image";
import Link from "next/link";

import Marquee from "react-fast-marquee";

type Company = {
  name: string;
  logo: string;
  width: number;
  height: number;
  href: string;
};

export const Logos = () => {
  const companies = [
    {
      name: "Uniswap",
      logo: "/logos/uniswap.png",
      width: 143,
      height: 26,
      href: "https://v4.uniswap.org/",
    },
    {
      name: "Inco",
      logo: "/logos/inco.svg",
      width: 100,
      height: 31,
      href: "https://www.inco.org/",
    },
    {
      name: "CoinGecko",
      logo: "/logos/coingecko.svg",
      width: 160,
      height: 22,
      href: "https://www.coingecko.com/",
    },
    {
      name: "Base",
      logo: "/logos/base.png",
      width: 100,
      height: 27,
      href: "https://www.base.org/",
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
              Powered by Uniswap V4 Hooks and Inco Lightning.
            </span>
          </h2>
        </div>

        <div className="flex w-full flex-col items-center">
          {/* Single endless scrolling row */}
          <Marquee speed={40} pauseOnHover className="py-4">
            {companies.map((company, index) => (
              <Link
                href={company.href}
                target="_blank"
                key={index}
                className="mx-12 inline-block transition-opacity hover:opacity-70"
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
      </div>
    </section>
  );
};


