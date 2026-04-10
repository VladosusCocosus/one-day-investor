import { cn } from "@/lib/utils";

type Step = { title: string; body: string };

const steps: Step[] = [
  {
    title: "Create a pocket",
    body: "Group by how you think: Revolut, Interactive Brokers, Cash, Home. One pocket per service or per thing.",
  },
  {
    title: "Add your assets",
    body: "Stocks and crypto auto-price themselves. Real estate, cars, and cash you set by hand.",
  },
  {
    title: "Take your first snapshot",
    body: "One click captures the whole picture — a monthly photograph of your net worth.",
  },
  {
    title: "Come back once a month",
    body: "We'll email you. Five minutes in the app, then close the tab and live your life.",
  },
  {
    title: "See the curve, not the ticker",
    body: "Your capital over years — not yesterday's 0.3% dip. The one chart that matters.",
  },
  {
    title: "Build the habit",
    body: "Twelve snapshots a year. A decade of snapshots is a decade of your financial story.",
  },
];

export function LandingGuide() {
  return (
    <section
      id="how"
      aria-labelledby="guide-heading"
      className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            How it works
          </p>
          <h2
            id="guide-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            Invest one day a month. Here&rsquo;s the whole rhythm.
          </h2>
          <p className="mt-5 text-base italic text-emerald-200/80 sm:text-lg">
            &ldquo;One day a month. That&rsquo;s all it takes to watch your capital grow.&rdquo;
          </p>
        </div>

        <ol className="relative mt-16 md:mt-20">
          {/* Spine — left edge on mobile, center on desktop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 left-6 w-px bg-gradient-to-b from-transparent via-emerald-400/35 to-transparent md:left-1/2 md:-translate-x-1/2"
          />

          {steps.map((step, i) => {
            const isLeft = i % 2 === 0;
            return (
              <li
                key={step.title}
                className="relative mb-8 md:mb-14 last:mb-0 md:grid md:grid-cols-[1fr_72px_1fr] md:items-center md:gap-6"
              >
                {/* Numbered node — absolute on mobile (hugs spine), grid-placed on desktop */}
                <div
                  aria-hidden="true"
                  className="absolute left-6 -translate-x-1/2 top-6 z-10 md:static md:translate-x-0 md:col-start-2 md:row-start-1 md:justify-self-center"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-300/70 text-sm font-bold text-emerald-200 shadow-[0_0_0_6px_rgba(2,40,28,0.95)]"
                    style={{ background: "#02281c" }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Card */}
                <div
                  className={cn(
                    "ml-16 md:ml-0 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-6 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60",
                    isLeft
                      ? "md:col-start-1 md:text-right"
                      : "md:col-start-3 md:text-left"
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-emerald-50">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-200/90">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
