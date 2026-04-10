import { LandingNav } from "@/components/landing/LandingNav";

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
      <main id="main" className="mx-auto max-w-[1200px] px-6 py-20 md:px-8">
        <p className="text-center text-emerald-200">Sections coming in later tasks...</p>
      </main>
    </div>
  );
}
