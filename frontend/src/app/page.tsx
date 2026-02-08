import { Background } from "@/components/background";
import { FAQ } from "@/components/blocks/faq";
import { Hero } from "@/components/blocks/hero";
import { Logos } from "@/components/blocks/logos";
import { Pricing } from "@/components/blocks/pricing";
import { Navbar } from "@/components/blocks/navbar";
import { Footer } from "@/components/blocks/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Background className="via-muted to-muted/80">
        <Hero />
        <Logos />
      </Background>
      <Background variant="bottom">
        <Pricing />
        <FAQ />
      </Background>
      <Footer />
    </>
  );
}
