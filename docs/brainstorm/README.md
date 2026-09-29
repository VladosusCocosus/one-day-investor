# One Day Investor — product brainstorm

The original working notes the product grew out of, translated from the Russian
draft they were first written in. Kept as a record of the early thinking, not as
current documentation — some of it shipped, some of it didn't.

## The idea

One Day Investor is a financial tracker for people who don't want to watch the
market every day.

**How it works:**
- One day a month you open the app and write down everything you own.
- An asset is anything with a price: a flat, investments, accounts, cards, cash,
  a car, and so on.
- It doesn't matter how far one particular stock dipped this week.
- What matters is seeing the month-over-month movement toward your goal.

**Philosophy:**
- Low update frequency — once a month, no more.
- Focus on the whole picture, not the fluctuations.
- Progress toward the goal is the headline metric, not portfolio return.

**What "goal" means here:**
- Not a SMART goal with a specific number and a deadline.
- More of a direction: "capital is growing month over month."
- Big wants (a car, a flat) exist in your head but aren't tracked separately.
- The user's own logic: "I need money; how to allocate it I'll decide once I
  have it."
- Consequence: the app must **not** push goal-setting of the "save X by date Y"
  kind.

**The headline metric is net worth:**
- The sum of everything with a price, minus debts.
- Any month-over-month growth is a win.
- No inflation adjustment, no liquid/illiquid split — one simple number.
- Everything else (category breakdowns, charts) is supporting material.

---

## Two modes of use

The app lives in two modes, and both matter.

**1. The quick monthly check-in (the main mode)**
- Goal: update the numbers as fast as possible.
- Open → run down the asset list → type the new values → leave.
- No distractions, no "while you're here, look at this too."

**2. Periodic reflection (quarterly or twice a year)**
- Make a coffee, sit down properly.
- Look at the charts and the trend, think about allocation.
- Maybe flag something, add a note.
- This is **not** a separate dashboard page — it's more a mood the user
  occasionally arrives in.

**Design consequence:**
- The fast mode has to be fast by default.
- Reflective tools (charts, analytics) are available but stay out of the way.

## What actually slows the monthly check-in down

The pain isn't "finding the data" — it's "moving it into the table."

**Volume of manual entry**
- The numbers aren't hard to find; banks and brokers all have them ready.
- But there are a lot of them, and typing them one by one is boring and slow.

**Arithmetic and currencies**
- Totalling it up is manual work.
- Converting currencies to one base currency is manual too.
- Neither is hard, but each time it eats time and energy.

**Consequence:** the app should take entry and recalculation off the user, not
help them "collect data from banks." The user already knows where their money is.

## Positioning: what we are not

We are not trying to replace the UI of banks and brokers.

- Banks show the numbers more precisely than we do — that's fine, we aren't
  competing on that.
- Banks **cannot** show all of a user's assets in one place (a flat + accounts in
  several currencies + a broker + crypto + cash).
- Banks **cannot** show how total capital rose or fell, month over month.

**Our niche is the two gaps no bank closes:**
1. **Aggregation** — every asset in one place, including the ones no bank holds
   (property, possessions, cash).
2. **The long timeline** — a history of total capital that outlives any change of
   bank or broker.

Everything else — exact balances, transactions, per-stock analytics — we leave to
the banks. We're about the whole picture.

## What we automate, what stays manual

**Automatic (the app fetches it):**
- Exchange rates against the user's base currency.
- Stock and ETF quotes.
- Crypto prices.
- Recalculating total capital.

**Manual (the user types it once a month):**
- Account and card balances.
- Share/crypto quantities, if they changed.
- The value of illiquid assets — flats, cars, possessions (the user's own
  estimate).
- Cash.

**Principle:** automate what is objective (today's share price is the same for
everyone). Leave manual what only the user knows (how much is sitting in that
particular account right now). No bank integrations — that's complexity and
fragility, and it breaks the promise of simplicity.

## Pockets — how to organise them

A **pocket** is the unit in which a user sees a slice of their capital. Users are
free to decide what that means, but we give a clear recommendation.

**Recommended pattern — by service and product:**
- `Bank` (current account)
- `Bank Invest` (brokerage account)
- `Bank Savings`
- `Interactive Brokers`
- `Property` — if you want it separate
- `Lego` — if someone genuinely invests in Lego
- and so on.

**Why:**
- It matches how users mentally sort their money ("where what sits").
- It's easy to update: open the bank app → see the figure → move it into the
  matching pocket.
- It doesn't impose a semantic classification ("holiday fund", "emergency
  buffer") — that's a separate layer that may or may not exist.

**What matters:**
- The system doesn't stop a user choosing another logic (by goal, by asset
  type — their business).
- Unusual assets (collections, possessions, property) are first-class pockets,
  not second-class citizens.

## Who it's for

**A broad niche inside the "deliberate saver" segment.**

The portrait:
- Already investing somehow — a brokerage account, crypto, deposits, property,
  or some combination.
- Above-average income, actively trying to build capital.
- Doesn't necessarily keep a spreadsheet, but thinks of their capital as
  something to grow.
- Not a finance professional — they don't need portfolio reports or Sharpe
  ratios.

What that means for the product:
- No need to explain why you'd count your money — these people are already
  interested.
- We do need to explain why this approach ("once a month, the whole picture")
  beats what they do now, or don't do.
- The term "net worth" is probably familiar — worth re-checking with a
  Russian-speaking audience.
- Onboarding is critical: the first visit has to reach "wow, I can already see my
  picture" within minutes.
- No active-trader jargon — our philosophy is the opposite.

## Value proposition (the landing page's first 30 seconds)

Three hooks that work together; none of them alone tells the whole story.

1. **"All your assets in one place"** — solves a pain the audience already feels:
   capital scattered across banks, brokers, crypto and property, with nothing
   showing it together.
2. **"Watch your capital grow month over month"** — the long timeline no single
   bank or broker can give, especially once the user changes providers.
3. **"Stop flinching at the market"** — the one-day-investor ideology, set
   against active trading and daily price-checking.

On the landing page all three have to be visible together, not offered as
"pick one."

## The reflection screen (quarterly, with coffee)

Three things that must be there — enough to make a user want to come back.

1. **Net worth by month** — the headline curve; everything else orbits it.
2. **Breakdown by pocket** — what capital consists of today and how the mix moved
   over time (pie or stacked bar — decide at design time).
3. **Growth dynamics** — not just the absolute figure but "you're up 12% over six
   months", "average gain X/month". Relative metrics that convey movement.

**Deliberately not doing, at least for now:**
- Event markers on the chart ("bought the flat here", "market crashed here"). A
  nice idea, but overload for an MVP.
- Arbitrary period comparison ("this year vs last", custom windows). Not a first
  necessity.

Principle: three simple strong things beat five compromised ones.

## Bringing the user back

The whole product rests on the user returning once a month. That's the single
point of failure — without the return there's no timeline, no reflection, no
value.

**Strategy: email by default, and the user picks the day.**

- Email is unobtrusive, and a reminder service already exists in the
  infrastructure.
- Default: the start of the month (exact default day to be decided).
- The user can pick their own day — "payday", "the 1st", "the last Friday".
- Push can come later if there's ever a mobile app.

**Why email:**
- The audience lives in their inbox.
- Email matches the product's slow rhythm — it doesn't nag, it arrives monthly.
- Push would be too aggressive for a "don't flinch at the market" philosophy.

**If the user skips a month:**

Combine two approaches.

1. **Automatic interpolation for the chart.** With no data for a month, carry the
   last known value forward (a flat line from the previous point). It isn't "the
   truth", but it keeps the chart from breaking into alarming holes. It is
   slightly dishonest — hence point 2.
2. **A gentle invitation to catch up.** On returning after a gap: "You were last
   here in February. Want to add March and April?" No judgement, no streak
   gamification. Just an offer to restore the picture.
3. If the user enters real figures for the missed months, interpolation is
   replaced by real data and the chart updates.
4. If they don't, the interpolated points stay but are marked subtly as an
   assumption, so the reflective mode shows where data was missing.

## Open questions

- **Monetisation** — not thought through yet; the author is simply building.
  We'll come back once the product has a shape. Likely future paths: freemium
  (basic tracking free; long history, export and multi-currency paid), or a soft
  subscription with a trial. Not an urgent decision.

## Privacy and trust

**Model: ordinary SaaS.**
- Data lives in our database, encrypted at rest.
- The user trusts us as they'd trust any other service.
- That's the simplest option to start with, and it's sufficient.

**Why that's enough:**
- We **don't store bank or broker tokens** — no integrations, no access.
- There is no way for the customer to lose money through us; we have no access to
  money at all.
- The worst a leak exposes is the user's capital figures. Unpleasant, but not
  catastrophic, and certainly not a financial loss.
- This is deliberate: "we don't reach into banks" simultaneously simplifies the
  product and lowers the security stakes.

**What it means for the architecture:**
- Encryption at rest and ordinary hygiene (secrets, backups, access) are a must.
- No need to complicate things with client-side encryption or local-first.
- An honest line for the landing page: "we don't connect to your banks — we
  physically cannot touch your money."
