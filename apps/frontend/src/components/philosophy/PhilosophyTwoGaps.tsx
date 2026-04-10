type Row = { text: string };

const bankRows: Row[] = [
  { text: "One account, or at best one family of accounts." },
  { text: "One currency." },
  { text: "History that resets when you switch banks." },
  { text: "Nothing about the apartment, the car, the cash under the mattress." },
];

const odiRows: Row[] = [
  { text: "Every pocket you own, in one place." },
  { text: "One net worth number, in your chosen currency." },
  { text: "A line that outlives any bank you ever use." },
  { text: "Everything that has a price — including the things banks can't see." },
];

export function PhilosophyTwoGaps() {
  return (
    <section
      id="philosophy-two-gaps"
      aria-labelledby="philosophy-two-gaps-heading"
      className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-[760px]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Positioning
          </p>
          <h2
            id="philosophy-two-gaps-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            Two gaps no bank can fill.
          </h2>
          <p className="mt-10 text-lg leading-relaxed text-emerald-100/90">
            Your bank is better than One Day Investor at almost everything. It knows your exact balance to the kopeck, it processes your transactions, it sends you statements. I'm not trying to replace any of that. There are two specific things, though, that no bank can do for you — and they happen to be the only two things I actually care about.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-emerald-900/50 bg-emerald-950/40 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:border-r md:border-emerald-900/50 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                What a bank shows you
              </p>
              <ul className="mt-5 space-y-3 text-base text-emerald-200/90">
                {bankRows.map((row) => (
                  <li key={row.text} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60"
                    />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-emerald-900/50 p-8 md:border-t-0 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                What One Day Investor shows you
              </p>
              <ul className="mt-5 space-y-3 text-base text-emerald-100">
                {odiRows.map((row) => (
                  <li key={row.text} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                    />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-[760px] text-lg leading-relaxed text-emerald-100/90">
          The banks will keep being banks. I just want to give you the two things they can't.
        </p>
      </div>
    </section>
  );
}
