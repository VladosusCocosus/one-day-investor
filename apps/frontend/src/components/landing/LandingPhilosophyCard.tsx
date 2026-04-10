import { Link } from "react-router";

export function LandingPhilosophyCard() {
  return (
    <section
      id="philosophy-card"
      aria-labelledby="philosophy-card-heading"
      className="px-6 py-16 md:px-8 md:py-20"
    >
      <div
        className="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-14 text-center shadow-xl shadow-emerald-950/40 md:px-14 md:py-16"
        style={{
          background:
            "radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          The idea
        </p>
        <h2
          id="philosophy-card-heading"
          className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
        >
          New here? Read why I built this.
        </h2>
        <p className="mx-auto mt-5 max-w-[560px] text-base text-emerald-200 md:text-lg">
          Two minutes. No sign-up. The philosophy behind One Day Investor.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            to="/philosophy"
            className="inline-flex h-12 items-center rounded-lg border border-emerald-300/40 bg-emerald-900/20 px-6 text-base font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-colors"
          >
            Read the philosophy →
          </Link>
        </div>
      </div>
    </section>
  );
}
