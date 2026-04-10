import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PhilosophyHero } from "@/components/philosophy/PhilosophyHero";
import { PhilosophyRitual } from "@/components/philosophy/PhilosophyRitual";
import { PhilosophyTwoGaps } from "@/components/philosophy/PhilosophyTwoGaps";
import { PhilosophyTheDeal } from "@/components/philosophy/PhilosophyTheDeal";
import { PhilosophyPockets } from "@/components/philosophy/PhilosophyPockets";
import { PhilosophyAudience } from "@/components/philosophy/PhilosophyAudience";
import { PhilosophyClosing } from "@/components/philosophy/PhilosophyClosing";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Invest one day a month. Ignore the other thirty.",
  description:
    "A letter from the person building One Day Investor: invest one day a month, ignore the other thirty.",
  author: {
    "@type": "Person",
    name: "Vlad",
  },
  publisher: {
    "@type": "Organization",
    name: "One Day Investor",
    url: "https://odinvestor.net",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://odinvestor.net/philosophy",
  },
};

export function PhilosophyPage() {
  usePageMeta(pageMeta.philosophy);
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-emerald-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-950"
      >
        Skip to content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNav />
      <main id="main">
        <PhilosophyHero />
        <PhilosophyRitual />
        <PhilosophyTwoGaps />
        <PhilosophyTheDeal />
        <PhilosophyPockets />
        <PhilosophyAudience />
        <PhilosophyClosing />
      </main>
      <LandingFooter />
    </div>
  );
}
