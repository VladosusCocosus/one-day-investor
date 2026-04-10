import { PullQuote } from "./PullQuote";

export function PhilosophyRitual() {
  return (
    <section
      id="philosophy-ritual"
      aria-labelledby="philosophy-ritual-heading"
      className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[760px]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          The ritual
        </p>
        <h2
          id="philosophy-ritual-heading"
          className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
        >
          Why a month, not a day.
        </h2>
        <div className="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
          <p>
            I don't want to check the markets every day. I don't think you should either.
          </p>
          <p>
            Most financial apps are built on an assumption I don't share: that more frequent data is more useful data. So they give you notifications, intraday charts, red and green arrows, a little dopamine hit every time your portfolio moves. The implicit message is: pay attention, you might miss something.
          </p>
          <p>
            One Day Investor is built on the opposite assumption. You almost certainly won't miss anything. The things that actually matter to your long-term wealth — jobs, savings rate, whether you kept investing through the scary months — move at the speed of months and years, not minutes.
          </p>
          <p>
            So the ritual is this:{" "}
            <strong className="font-semibold text-emerald-50">
              one day a month, you open the app and write down where your money is.
            </strong>{" "}
            That's it. The other thirty days, you live your life.
          </p>
          <p>
            I don't track a specific goal with a specific number and a specific date. I don't know how much I'll need in twenty years. I don't know what I'll spend it on. What I do know is that I want the line to go up over time — not every month, but on average, over enough months that a trend is visible. That's the whole game.
          </p>
        </div>
      </div>
      <PullQuote>
        The market is fast. Wealth is slow. Don't confuse them.
      </PullQuote>
    </section>
  );
}
