export function PhilosophyPockets() {
  return (
    <section
      id="philosophy-pockets"
      aria-labelledby="philosophy-pockets-heading"
      className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[760px]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Organization
        </p>
        <h2
          id="philosophy-pockets-heading"
          className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
        >
          Pockets, the way you already think.
        </h2>
        <div className="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
          <p>
            When I ask someone where their money is, they don't say "40% equities, 30% fixed income, 20% cash, 10% alternatives." They say:{" "}
            <em className="text-emerald-50 not-italic">
              "Some at Tinkoff, some at Interactive Brokers, the apartment, a bit of crypto, and whatever's in my wallet."
            </em>
          </p>
          <p>
            That's how pockets work in One Day Investor. A pocket is wherever you mentally keep a chunk of your net worth. One per account, or one per thing, or one per category — whatever matches the map that already lives in your head.
          </p>
          <p>
            If you actually invest in Lego sets, Lego is a pocket. If your apartment is half of your net worth, the apartment is a pocket. Nothing is a second-class citizen here, because the real point isn't taxonomy — it's making sure nothing gets left out when you do the monthly write-down.
          </p>
        </div>
      </div>
    </section>
  );
}
