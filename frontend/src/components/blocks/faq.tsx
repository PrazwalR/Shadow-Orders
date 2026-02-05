import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const categories = [
  {
    title: "Getting Started",
    questions: [
      {
        question: "What is Shadow Orders?",
        answer:
          "Shadow Orders is a decentralized exchange protocol that enables private limit orders on Uniswap V4. Using Fully Homomorphic Encryption (FHE) from Inco Network, your order details remain encrypted until execution.",
      },
      {
        question: "How do I get testnet tokens?",
        answer:
          "Visit the Faucet page and connect your wallet. Select the token you want (mUSDC, mDAI, mWBTC, mLINK, or mWETH), choose an amount, and click Mint. You'll also need Base Sepolia ETH for gas fees.",
      },
      {
        question: "Which network does Shadow Orders run on?",
        answer:
          "Shadow Orders is currently deployed on Base Sepolia testnet. Make sure your wallet is connected to Base Sepolia (Chain ID: 84532) to use the protocol.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    questions: [
      {
        question: "How does FHE protect my orders?",
        answer:
          "Fully Homomorphic Encryption allows computations to be performed on encrypted data. Your limit price and amount are encrypted client-side before being submitted to the blockchain. No one, including validators, can see your order details.",
      },
      {
        question: "Can bots front-run my orders?",
        answer:
          "No. Since your order details are encrypted, MEV bots cannot see your limit price or amount. This eliminates front-running and sandwich attacks completely.",
      },
    ],
  },
  {
    title: "Technical",
    questions: [
      {
        question: "What is Uniswap V4 Hooks?",
        answer:
          "Uniswap V4 introduced 'hooks' - smart contracts that can execute custom logic at various points in a swap lifecycle. Shadow Orders uses this to integrate encrypted limit orders directly into Uniswap pools.",
      },
      {
        question: "Is the code open source?",
        answer:
          "Yes! Shadow Orders is built for the Hookathon hackathon. The smart contracts and frontend code are available on GitHub for review and contribution.",
      },
    ],
  },
];

export const FAQ = ({
  headerTag = "h2",
  className,
  className2,
}: {
  headerTag?: "h1" | "h2";
  className?: string;
  className2?: string;
}) => {
  return (
    <section className={cn("py-28 lg:py-32", className)}>
      <div className="container max-w-5xl">
        <div className={cn("mx-auto grid gap-16 lg:grid-cols-2", className2)}>
          <div className="space-y-4">
            {headerTag === "h1" ? (
              <h1 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
                Got Questions?
              </h1>
            ) : (
              <h2 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
                Got Questions?
              </h2>
            )}
            <p className="text-muted-foreground max-w-md leading-snug lg:mx-auto">
              If you can&apos;t find what you&apos;re looking for, check out our{" "}
              <Link href="/docs" className="underline underline-offset-4">
                documentation
              </Link>
              .
            </p>
          </div>

          <div className="grid gap-6 text-start">
            {categories.map((category, categoryIndex) => (
              <div key={category.title} className="">
                <h3 className="text-muted-foreground border-b py-4">
                  {category.title}
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, i) => (
                    <AccordionItem key={i} value={`${categoryIndex}-${i}`}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
