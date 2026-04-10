import { HeroSparkline } from "@/components/landing/HeroSparkline";

export function PhilosophyHero() {
  return (
    <section
      id="philosophy-hero"
      aria-labelledby="philosophy-hero-heading"
      className="relative overflow-hidden px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28"
    >
      <HeroSparkline className="pointer-events-none absolute -right-8 top-0 h-full w-[520px] opacity-20 md:opacity-30" />
      <div className="relative mx-auto max-w-[960px] text-center">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          Philosophy
        </p>
        <h1
          id="philosophy-hero-heading"
          className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Invest one day a month.
          <br />
          <span className="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
            Ignore the other thirty.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-base text-emerald-200 md:text-lg">
          A letter from the person building One Day Investor.
        </p>
      </div>
    </section>
  );
}
