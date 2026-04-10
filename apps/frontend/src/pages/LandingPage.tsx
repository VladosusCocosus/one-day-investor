import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingDashboardPreview } from "@/components/landing/LandingDashboardPreview";
import { LandingFeatures } from "@/components/landing/LandingFeatures";

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <LandingNav />
      <main id="main">
        <LandingHero />
        <LandingDashboardPreview />
        <LandingFeatures />
      </main>
    </div>
  );
}
