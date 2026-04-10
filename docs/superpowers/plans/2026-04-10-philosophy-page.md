# Philosophy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public `/philosophy` page — a founder letter from Vlad explaining the idea behind One Day Investor — and link to it prominently from the landing page.

**Architecture:** One new `PhilosophyPage` that reuses the landing chrome (`LandingNav`, `LandingFooter`, gradient background) and composes seven self-contained section components plus a shared `PullQuote`. The landing page gets a new nav link and a new invitation card. The existing landing sparkline SVG is extracted to a reusable component so both the landing hero and the philosophy hero can share it.

**Tech Stack:** React 19, react-router v7, Tailwind v4, TypeScript. No tests — the frontend has no test runner configured, so verification is `bun --cwd apps/frontend run lint` + `bun --cwd apps/frontend run build` + a final visual smoke test.

**Spec:** `docs/superpowers/specs/2026-04-10-philosophy-page-design.md`

---

## Conventions used in this plan

- **Package manager:** bun (workspace). Lint command: `bun --cwd apps/frontend run lint`. Build command: `bun --cwd apps/frontend run build`. Dev: `bun --cwd apps/frontend run dev`.
- **Import alias:** `@/` points to `apps/frontend/src/`.
- **Metadata:** the frontend has an established `usePageMeta(pageMeta.<key>)` pattern (see `apps/frontend/src/lib/use-page-meta.ts` and `apps/frontend/src/lib/metadata.ts`). The new page follows the same pattern.
- **Commits:** one commit per task, conventional-commit style (`feat(philosophy): ...`), signed with `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`.
- **Verification per task:** after each task, run `bun --cwd apps/frontend run lint`. Expected output: no errors, no new warnings.

---

## Task 1: Add philosophy entry to the page metadata map

**Files:**
- Modify: `apps/frontend/src/lib/metadata.ts`

- [ ] **Step 1: Add `philosophy` to the `pageMeta` type union and object**

Replace the `pageMeta` declaration so it reads:

```ts
export const pageMeta: Record<
  | "login"
  | "dashboard"
  | "profile"
  | "assets"
  | "snapshots"
  | "analytics"
  | "philosophy",
  Meta
> = {
  login: {
    title: "Sign in",
    description:
      "Sign in to One Day Investor and keep watching your wealth grow.",
  },
  dashboard: {
    title: "Dashboard",
    description:
      "Your portfolio at a glance — totals, trends, and pockets in one calm view.",
  },
  profile: {
    title: "Profile",
    description: "Shape your pockets and the structure of your portfolio.",
  },
  assets: {
    title: "Assets",
    description: "Every asset across every pocket, in one place.",
  },
  snapshots: {
    title: "Snapshots",
    description: "Capture and revisit portfolio snapshots over time.",
  },
  analytics: {
    title: "Analytics",
    description:
      "Distribution, timelines, and performance for your portfolio.",
  },
  philosophy: {
    title: "Philosophy",
    description:
      "A letter from the person building One Day Investor: invest one day a month, ignore the other thirty.",
  },
};
```

- [ ] **Step 2: Run lint**

Run: `bun --cwd apps/frontend run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/metadata.ts
git commit -m "$(cat <<'EOF'
feat(philosophy): add page metadata entry

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract HeroSparkline into its own component

The existing sparkline in `LandingHero.tsx` is a local function with hardcoded opacity. The philosophy hero needs the same SVG at lower opacity. Extract it to a reusable component that takes a `className` prop, then update `LandingHero` to import it.

**Files:**
- Create: `apps/frontend/src/components/landing/HeroSparkline.tsx`
- Modify: `apps/frontend/src/components/landing/LandingHero.tsx`

- [ ] **Step 1: Create the extracted component**

Create `apps/frontend/src/components/landing/HeroSparkline.tsx` with this exact content:

```tsx
type Props = { className?: string };

export function HeroSparkline({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 520 300"
      fill="none"
    >
      <defs>
        <linearGradient id="hero-spark-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30 L 520 300 L 0 300 Z"
        fill="url(#hero-spark-fill)"
      />
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30"
        stroke="url(#hero-spark-stroke)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Update LandingHero to import and use the extracted component**

Replace the entire contents of `apps/frontend/src/components/landing/LandingHero.tsx` with:

```tsx
import { Link } from "react-router";
import { GoogleIcon } from "./GoogleIcon";
import { HeroSparkline } from "./HeroSparkline";

export function LandingHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16"
    >
      <HeroSparkline className="pointer-events-none absolute -right-8 top-0 h-full w-[520px] opacity-40 md:opacity-60" />
      <div className="relative mx-auto max-w-[960px] text-center">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          One Day Investor
        </p>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-6xl md:text-7xl">
          A calm, visual way
          <br />
          <span className="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
            to watch your wealth grow.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] text-base text-emerald-200 md:text-xl">
          Track every pocket, asset, and trend in one place.
          <br className="hidden sm:block" />
          Free. No spreadsheets.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/30 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </Link>
          <a
            href="#how"
            className="inline-flex h-12 items-center rounded-lg border border-emerald-300/30 px-6 text-base font-semibold text-emerald-100 hover:bg-emerald-900/30 transition-colors"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run lint and build**

Run: `bun --cwd apps/frontend run lint && bun --cwd apps/frontend run build`
Expected: no errors. The landing hero should still render identically (same classes).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/landing/HeroSparkline.tsx apps/frontend/src/components/landing/LandingHero.tsx
git commit -m "$(cat <<'EOF'
refactor(landing): extract HeroSparkline for reuse

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create the shared PullQuote component

**Files:**
- Create: `apps/frontend/src/components/philosophy/PullQuote.tsx`

- [ ] **Step 1: Create the component file**

Create `apps/frontend/src/components/philosophy/PullQuote.tsx` with this exact content:

```tsx
import type { ReactNode } from "react";

export function PullQuote({ children }: { children: ReactNode }) {
  return (
    <figure className="my-14 md:my-20">
      <blockquote className="mx-auto max-w-[760px] text-center">
        <p className="text-2xl font-semibold italic leading-snug tracking-tight text-emerald-100 sm:text-3xl md:text-4xl">
          {children}
        </p>
      </blockquote>
    </figure>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `bun --cwd apps/frontend run lint`
Expected: no errors. Unused-import warning is fine since nothing imports it yet — it will be consumed in Task 5 and Task 9.

Note: if lint treats unused exports as errors, skip this standalone lint run and verify together with Task 5.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/philosophy/PullQuote.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PullQuote presentational component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create PhilosophyHero (Section 1)

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyHero.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyHero.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyHero.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyHero section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create PhilosophyRitual (Section 2 — "Why a month, not a day")

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyRitual.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyRitual.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Run lint**

Run: `bun --cwd apps/frontend run lint`
Expected: no errors. (`PullQuote` is now consumed, resolving any lingering unused-export concern from Task 3.)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyRitual.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyRitual section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create PhilosophyTwoGaps (Section 3 — "Two gaps no bank can fill")

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyTwoGaps.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyTwoGaps.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Run lint**

Run: `bun --cwd apps/frontend run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyTwoGaps.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyTwoGaps section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create PhilosophyTheDeal (Section 4 — "What I do for you, what you do yourself")

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyTheDeal.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyTheDeal.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Run lint**

Run: `bun --cwd apps/frontend run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyTheDeal.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyTheDeal section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Create PhilosophyPockets (Section 5)

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyPockets.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyPockets.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyPockets.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyPockets section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Create PhilosophyAudience (Section 6)

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyAudience.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyAudience.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyAudience.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyAudience section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Create PhilosophyClosing (Section 7 — signature + CTA)

**Files:**
- Create: `apps/frontend/src/components/philosophy/PhilosophyClosing.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/philosophy/PhilosophyClosing.tsx` with this exact content:

```tsx
import { Link } from "react-router";
import { GoogleIcon } from "@/components/landing/GoogleIcon";

export function PhilosophyClosing() {
  return (
    <section
      id="philosophy-closing"
      aria-labelledby="philosophy-closing-heading"
      className="px-6 py-24 md:px-8 md:py-32"
    >
      <div
        className="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-24"
        style={{
          background:
            "radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%)",
        }}
      >
        <p
          id="philosophy-closing-heading"
          className="text-xl italic text-emerald-100 md:text-2xl"
        >
          — Vlad, building One Day Investor
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/philosophy/PhilosophyClosing.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyClosing signature section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Create PhilosophyPage and wire the route

**Files:**
- Create: `apps/frontend/src/pages/PhilosophyPage.tsx`
- Modify: `apps/frontend/src/main.tsx`

- [ ] **Step 1: Create the page component**

Create `apps/frontend/src/pages/PhilosophyPage.tsx` with this exact content:

```tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PhilosophyHero } from "@/components/philosophy/PhilosophyHero";
import { PhilosophyRitual } from "@/components/philosophy/PhilosophyRitual";
import { PhilosophyTwoGaps } from "@/components/philosophy/PhilosophyTwoGaps";
import { PhilosophyTheDeal } from "@/components/philosophy/PhilosophyTheDeal";
import { PhilosophyPockets } from "@/components/philosophy/PhilosophyPockets";
import { PhilosophyAudience } from "@/components/philosophy/PhilosophyAudience";
import { PhilosophyClosing } from "@/components/philosophy/PhilosophyClosing";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Invest one day a month. Ignore the other thirty.",
  description:
    "A letter from the person building One Day Investor: invest one day a month, ignore the other thirty.",
  author: {
    "@type": "Person",
    name: "Vlad",
  },
  publisher: {
    "@type": "Organization",
    name: "One Day Investor",
    url: "https://odinvestor.net",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://odinvestor.net/philosophy",
  },
};

export function PhilosophyPage() {
  usePageMeta(pageMeta.philosophy);
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-emerald-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-950"
      >
        Skip to content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNav />
      <main id="main">
        <PhilosophyHero />
        <PhilosophyRitual />
        <PhilosophyTwoGaps />
        <PhilosophyTheDeal />
        <PhilosophyPockets />
        <PhilosophyAudience />
        <PhilosophyClosing />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in main.tsx**

In `apps/frontend/src/main.tsx`, add the import near the other page imports:

```ts
import { PhilosophyPage } from "./pages/PhilosophyPage";
```

Then add a new public route entry to the `createBrowserRouter` array, immediately after the `/login` route. The final public routes section should look like:

```ts
const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/philosophy",
    element: <PhilosophyPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      // ...existing protected routes unchanged...
    ],
  },
]);
```

Do not touch the protected routes section.

- [ ] **Step 3: Run lint and build**

Run: `bun --cwd apps/frontend run lint && bun --cwd apps/frontend run build`
Expected: no errors. The build should succeed.

- [ ] **Step 4: Manual smoke test**

Run: `bun --cwd apps/frontend run dev`

Open `http://localhost:5173/philosophy` in a browser. Verify:
- Page renders end-to-end with all seven sections visible
- Nav and footer from the landing appear
- Browser tab title reads "Philosophy · One Day Investor"
- Keyboard Tab focuses the "Skip to content" link first
- The "Sign in with Google" button at the bottom links to `/login`

Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/PhilosophyPage.tsx apps/frontend/src/main.tsx
git commit -m "$(cat <<'EOF'
feat(philosophy): add PhilosophyPage and wire /philosophy route

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Add Philosophy link to LandingNav

The existing "Features" link is an in-page anchor (`#features`) that only works on the landing route. On the `/philosophy` route it would dead-click, so we hide it there. The new "Philosophy" link is always present.

**Files:**
- Modify: `apps/frontend/src/components/landing/LandingNav.tsx`

- [ ] **Step 1: Update the nav**

Replace the entire contents of `apps/frontend/src/components/landing/LandingNav.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaLabel = user ? "Go to dashboard" : "Sign in";
  const ctaHref = user ? "/dashboard" : "/login";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full motion-safe:transition-colors",
        scrolled
          ? "bg-[#02281c]/95 backdrop-blur-md border-b border-emerald-900/40"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-emerald-100 hover:text-white transition-colors">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[3px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">
            One Day Investor
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {isLanding && (
            <a
              href="#features"
              className="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
            >
              Features
            </a>
          )}
          <Link
            to="/philosophy"
            aria-current={pathname === "/philosophy" ? "page" : undefined}
            className="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            Philosophy
          </Link>
          {loading ? (
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-[84px] items-center rounded-md bg-emerald-50/20"
            />
          ) : (
            <Link
              to={ctaHref}
              className="inline-flex h-9 items-center rounded-md bg-emerald-50 px-4 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors"
            >
              {ctaLabel}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Run lint and build**

Run: `bun --cwd apps/frontend run lint && bun --cwd apps/frontend run build`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run: `bun --cwd apps/frontend run dev`. Verify:
- On `/`: both "Features" and "Philosophy" links are visible on `md:` and above; clicking "Features" still scrolls to the features section; clicking "Philosophy" navigates to `/philosophy` without a full page reload.
- On `/philosophy`: the "Features" link is gone; the "Philosophy" link is styled as the current page (inspect: it should have `aria-current="page"`).
- Browser back/forward between the two pages works.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingNav.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add Philosophy link to nav

Hide the Features anchor on non-landing routes so it never
dead-clicks. The Philosophy link is always present and marks
itself as aria-current when active.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Create LandingPhilosophyCard and wire it into LandingPage

**Files:**
- Create: `apps/frontend/src/components/landing/LandingPhilosophyCard.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 1: Create the card component**

Create `apps/frontend/src/components/landing/LandingPhilosophyCard.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Wire the card into LandingPage between Features and HowItWorks**

Replace the entire contents of `apps/frontend/src/pages/LandingPage.tsx` with:

```tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingDashboardPreview } from "@/components/landing/LandingDashboardPreview";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingPhilosophyCard } from "@/components/landing/LandingPhilosophyCard";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "One Day Investor",
  url: "https://odinvestor.net",
  description: "A calm, visual way to watch your wealth grow.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-emerald-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-950"
      >
        Skip to content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNav />
      <main id="main">
        <LandingHero />
        <LandingDashboardPreview />
        <LandingFeatures />
        <LandingPhilosophyCard />
        <LandingHowItWorks />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 3: Run lint and build**

Run: `bun --cwd apps/frontend run lint && bun --cwd apps/frontend run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingPhilosophyCard.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add philosophy invitation card between Features and HowItWorks

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Final verification smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run the full build**

Run: `bun --cwd apps/frontend run lint && bun --cwd apps/frontend run build`
Expected: both succeed with no errors.

- [ ] **Step 2: Manual smoke test**

Run: `bun --cwd apps/frontend run dev`

Go through this checklist in a browser at `http://localhost:5173`:

**On `/` (landing):**
- [ ] Page renders as before — hero, dashboard preview, features, NEW philosophy card, how it works, final CTA, footer.
- [ ] Nav shows "Features", "Philosophy", and the sign-in CTA (on `md:` and above).
- [ ] The new card appears between Features and How it works.
- [ ] "Features" anchor scrolls to the features section.
- [ ] "Philosophy" nav link navigates to `/philosophy` without a full reload.
- [ ] "Read the philosophy →" button on the new card also navigates to `/philosophy`.

**On `/philosophy`:**
- [ ] All seven sections render in this order: Hero, The ritual, Two gaps no bank can fill, What I do for you / What you do yourself, Pockets, Who this is for, Signature + CTA.
- [ ] Browser tab title: `Philosophy · One Day Investor`.
- [ ] Hero sparkline is visible but subtle (low opacity).
- [ ] The two "card" sections (Two Gaps, The Deal) render as two-column grids on desktop and stack on mobile.
- [ ] Both pull quotes render (one in Ritual, one in Audience).
- [ ] The signature block reads `— Vlad, building One Day Investor`.
- [ ] "Sign in with Google" button in the signature block navigates to `/login`.
- [ ] Nav "Features" link is NOT shown on this page.
- [ ] Nav "Philosophy" link is present and has `aria-current="page"` (inspect the DOM).
- [ ] Clicking "One Day Investor" logo in the nav returns to `/`.
- [ ] Browser back navigates back to the landing.

**Responsive check:**
- [ ] Resize to 375px wide. Hero headline does not overflow. Two-column cards become one column. Pull quotes remain readable.

**Keyboard / a11y check:**
- [ ] Tab from the top of `/philosophy` focuses the "Skip to content" link first.
- [ ] Pressing Enter on Skip to content jumps focus past the nav.

Stop the dev server when the checklist passes.

- [ ] **Step 3: No commit for this task** — verification only.

---

## Spec coverage checklist

Before marking the plan done, confirm every section of the spec has a corresponding task:

| Spec item | Task(s) |
|---|---|
| `/philosophy` route added to router | Task 11 |
| `PhilosophyPage` with gradient background + skip-to-content + JSON-LD | Task 11 |
| Nav + Footer reused from landing | Task 11 |
| Hero (Section 1) with reused sparkline | Tasks 2, 4 |
| Section 2 — The ritual (body + pull quote) | Tasks 3, 5 |
| Section 3 — Two gaps no bank can fill (two-column card) | Task 6 |
| Section 4 — What I do for you / What you do yourself (two-column card) | Task 7 |
| Section 5 — Pockets | Task 8 |
| Section 6 — Audience (pull quote) | Tasks 3, 9 |
| Section 7 — Signature + CTA | Task 10 |
| Page metadata via `usePageMeta(pageMeta.philosophy)` | Tasks 1, 11 |
| JSON-LD `Article` schema | Task 11 |
| Nav link "Philosophy" added | Task 12 |
| Invitation card between Features and HowItWorks | Task 13 |
| Final visual + keyboard verification | Task 14 |
