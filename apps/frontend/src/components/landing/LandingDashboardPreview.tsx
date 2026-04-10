export function LandingDashboardPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-[1100px] px-6 md:mt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 h-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-white shadow-2xl shadow-emerald-950/50 ring-1 ring-white/10">
        <picture>
          <source srcSet="/landing-dashboard-preview.webp" type="image/webp" />
          <img
            src="/landing-dashboard-preview.png"
            alt="The One Day Investor dashboard showing portfolio total, distribution donut, and timeline chart."
            width={1600}
            height={680}
            loading="eager"
            fetchPriority="high"
            className="block h-auto w-full"
          />
        </picture>
      </div>
    </div>
  );
}
