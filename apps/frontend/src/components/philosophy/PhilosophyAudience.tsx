import { PullQuote } from "./PullQuote";

export function PhilosophyAudience() {
  return (
    <section
      id="philosophy-audience"
      aria-labelledby="philosophy-audience-heading"
      className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[760px]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Audience
        </p>
        <h2
          id="philosophy-audience-heading"
          className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
        >
          Who this is for.
        </h2>
      </div>
      <PullQuote>
        If you already invest — calmly, imperfectly, without a spreadsheet — this is for you.
      </PullQuote>
      <div className="mx-auto max-w-[760px] space-y-6 text-lg leading-relaxed text-emerald-100/90">
        <p>
          You probably already have a brokerage account. Maybe some crypto. Maybe an apartment, maybe a savings account in a different currency, maybe a little cash. You think of your money as something you're trying to grow, not something you're trying to optimize.
        </p>
        <p>
          You are not a day trader. You don't want to be one. You don't need Sharpe ratios, you don't care about rebalancing algorithms, and you've never wanted a "portfolio analytics dashboard."
        </p>
        <p>
          You just want to know — honestly, monthly, in one number — whether the line is going up.
        </p>
        <p className="text-emerald-50">
          If that's you, I built this for us.
        </p>
      </div>
    </section>
  );
}
