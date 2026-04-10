import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingDashboardPreview } from "@/components/landing/LandingDashboardPreview";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingPhilosophyCard } from "@/components/landing/LandingPhilosophyCard";
import { LandingGuide } from "@/components/landing/LandingGuide";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "One Day Investor",
  url: "https://odinvestor.net",
  description: "A calm, visual way to watch your wealth grow.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function LandingPage() {
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
        <LandingHero />
        <LandingDashboardPreview />
        <LandingFeatures />
        <LandingPhilosophyCard />
        <LandingGuide />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
