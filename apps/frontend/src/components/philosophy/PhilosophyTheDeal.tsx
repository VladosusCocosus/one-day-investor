const automatic: string[] = [
  "Exchange rates to your base currency",
  "Stock and ETF prices",
  "Crypto prices",
  "Total capital, always recalculated for you",
];

const manual: string[] = [
  "Account and card balances",
  "Share and crypto quantities (if they changed)",
  "Estimates for apartments, cars, things",
  "Cash",
];

export function PhilosophyTheDeal() {
  return (
    <section
      id="philosophy-the-deal"
      aria-labelledby="philosophy-the-deal-heading"
      className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[760px]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            The deal
          </p>
          <h2
            id="philosophy-the-deal-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            What I do for you. What you do yourself.
          </h2>
          <div className="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
            <p>
              I want to be honest about where the work lives, because most "all-in-one finance apps" are a little dishonest about this. The ones that promise total automation either connect to your bank (fragile, scary, and not how I want to build software) or quietly skip everything that doesn't have an API (which is most of what you actually own).
            </p>
            <p>So here's the deal.</p>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-emerald-900/50 bg-emerald-950/40 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:border-r md:border-emerald-900/50 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Automatic
              </p>
              <ul className="mt-5 space-y-3 text-base text-emerald-100">
                {automatic.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-emerald-900/50 p-8 md:border-t-0 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                By hand, once a month
              </p>
              <ul className="mt-5 space-y-3 text-base text-emerald-100">
                {manual.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-[760px] text-lg leading-relaxed text-emerald-100/90">
          No bank integrations. No open banking. I physically can't touch your money, and I never will. That's not a compromise, that's the design. You already know where your money is — you just need a place to write it down that doesn't feel like a spreadsheet.
        </p>
      </div>
    </section>
  );
}