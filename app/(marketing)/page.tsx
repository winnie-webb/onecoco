import { Hero } from "@/components/marketing/Hero";
import { Cocos } from "@/components/marketing/Cocos";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { BuildTeaser } from "@/components/marketing/BuildTeaser";
import { Partners } from "@/components/marketing/Partners";
import { FinalCta } from "@/components/marketing/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <Cocos />
      <HowItWorks />
      <BuildTeaser />
      <Partners />
      <FinalCta />
    </>
  );
}
