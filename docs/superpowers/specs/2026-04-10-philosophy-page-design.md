# Philosophy Page — Design Spec

**Date:** 2026-04-10
**Author:** Vlad
**Status:** Approved, ready for implementation plan

## Summary

Add a public `/philosophy` page to One Day Investor — a founder letter from Vlad explaining the idea behind the product. The page reuses the existing landing design system (dark emerald gradient, `LandingNav`, `LandingFooter`, eyebrow + H2 section rhythm, `rounded-2xl` cards). A prominent link lives both in the landing nav and as a dedicated invitation card between the Features and How-it-Works sections.

Content is derived from `docs/brainstorm/README.md`, scoped to the **product idea only** — monetization, privacy/security, retention mechanics, and reflection-mode feature details are intentionally excluded.

## Goals

- Give first-time visitors a place to read *why* One Day Investor exists, in the founder's voice.
- Reinforce the "calm, slow, opinionated" positioning that the landing hints at but can't fully deliver.
- Establish the "conscious accumulator" audience and the "I can't touch your money" trust pitch without burying them on the landing page.

## Non-Goals

- Monetization messaging (deferred per brainstorm).
- Privacy/security deep-dive (a future `/security` or in-app doc).
- Reflection-mode feature spec (separate feature work).
- Team bios, roadmap, changelog, blog.
- SEO optimization beyond standard meta + JSON-LD `Article` schema.

## User Stories

- **As a first-time visitor**, I land on `/`, see a "Philosophy" link in the nav and a visible invitation card mid-page, click through, and read a 2–3 minute letter that tells me what this product is actually for.
- **As a returning skeptic**, I want to understand the positioning (how this differs from YNAB, Copilot, Personal Capital) without reading marketing bullet points.
- **As a search engine**, I see a well-structured article page with proper metadata.

## Design

### Voice

First-person founder letter from Vlad. Direct address ("I built this because..."). Signature at the bottom: *"— Vlad, building One Day Investor"*.

All copy in English.

### Visual approach

**Typography-first with subtle accents.** No heavy illustrations. Each section has one small visual anchor: a reused sparkline in the hero, a two-column comparison card for "Two gaps no bank can fill", a side-by-side list card for "What I do for you, what you do yourself", and occasional pull quotes. Section rhythm matches the existing landing (uppercase tracked eyebrow + large H2).

### Page structure (top to bottom)

#### 1. Hero

- **Eyebrow:** `Philosophy`
- **H1:** *"Invest one day a month. Ignore the other thirty."*
- **Subhead:** *"A letter from the person building One Day Investor."*
- **Background accent:** reused `HeroSparkline` SVG from `LandingHero`, at `opacity-30` behind the title.
- Padding and max-width mirror `LandingHero`.

#### 2. Why a month, not a day

- **Eyebrow:** `The ritual`
- **H2:** *"Why a month, not a day."*
- **Body (draft):**
  > I don't want to check the markets every day. I don't think you should either.
  >
  > Most financial apps are built on an assumption I don't share: that more frequent data is more useful data. So they give you notifications, intraday charts, red and green arrows, a little dopamine hit every time your portfolio moves. The implicit message is: pay attention, you might miss something.
  >
  > One Day Investor is built on the opposite assumption. You almost certainly won't miss anything. The things that actually matter to your long-term wealth — jobs, savings rate, whether you kept investing through the scary months — move at the speed of months and years, not minutes.
  >
  > So the ritual is this: **one day a month, you open the app and write down where your money is.** That's it. The other thirty days, you live your life.
  >
  > I don't track a specific goal with a specific number and a specific date. I don't know how much I'll need in twenty years. I don't know what I'll spend it on. What I do know is that I want the line to go up over time — not every month, but on average, over enough months that a trend is visible. That's the whole game.

- **Pull quote (after the body):** *"The market is fast. Wealth is slow. Don't confuse them."*

#### 3. Two gaps no bank can fill

- **Eyebrow:** `Positioning`
- **H2:** *"Two gaps no bank can fill."*
- **Lead paragraph (draft):**
  > Your bank is better than One Day Investor at almost everything. It knows your exact balance to the kopeck, it processes your transactions, it sends you statements. I'm not trying to replace any of that. There are two specific things, though, that no bank can do for you — and they happen to be the only two things I actually care about.
- **Visual anchor: two-column comparison card.** Same `rounded-2xl border border-emerald-900/50 bg-emerald-950/40` style as `LandingFeatures`, but a single wide card split in half by a subtle emerald divider.

  **Left column — "What a bank shows you"**
  - One account, or at best one family of accounts.
  - One currency.
  - History that resets when you switch banks.
  - Nothing about the apartment, the car, the cash under the mattress.

  **Right column — "What One Day Investor shows you"**
  - Every pocket you own, in one place.
  - One net worth number, in your chosen currency.
  - A line that outlives any bank you ever use.
  - Everything that has a price — including the things banks can't see.

- **Closing sentence (draft):**
  > The banks will keep being banks. I just want to give you the two things they can't.

#### 4. What I do for you, what you do yourself

- **Eyebrow:** `The deal`
- **H2:** *"What I do for you. What you do yourself."*
- **Body (draft):**
  > I want to be honest about where the work lives, because most "all-in-one finance apps" are a little dishonest about this. The ones that promise total automation either connect to your bank (fragile, scary, and not how I want to build software) or quietly skip everything that doesn't have an API (which is most of what you actually own).
  >
  > So here's the deal.
- **Visual anchor: side-by-side list card.** Single `rounded-2xl` card with two columns:

  **Left — "Automatic"**
  - Exchange rates to your base currency
  - Stock and ETF prices
  - Crypto prices
  - Total capital, always recalculated for you

  **Right — "By hand, once a month"**
  - Account and card balances
  - Share and crypto quantities (if they changed)
  - Estimates for apartments, cars, things
  - Cash

- **Closing (draft):**
  > No bank integrations. No open banking. I physically can't touch your money, and I never will. That's not a compromise, that's the design. You already know where your money is — you just need a place to write it down that doesn't feel like a spreadsheet.

#### 5. Pockets, the way you already think

- **Eyebrow:** `Organization`
- **H2:** *"Pockets, the way you already think."*
- **Body (draft):**
  > When I ask someone where their money is, they don't say "40% equities, 30% fixed income, 20% cash, 10% alternatives." They say: *"Some at Tinkoff, some at Interactive Brokers, the apartment, a bit of crypto, and whatever's in my wallet."*
  >
  > That's how pockets work in One Day Investor. A pocket is wherever you mentally keep a chunk of your net worth. One per account, or one per thing, or one per category — whatever matches the map that already lives in your head.
  >
  > If you actually invest in Lego sets, Lego is a pocket. If your apartment is half of your net worth, the apartment is a pocket. Nothing is a second-class citizen here, because the real point isn't taxonomy — it's making sure nothing gets left out when you do the monthly write-down.

#### 6. Who this is for

- **Eyebrow:** `Audience`
- **H2:** *"Who this is for."*
- **Pull quote (above body):** *"If you already invest — calmly, imperfectly, without a spreadsheet — this is for you."*
- **Body (draft):**
  > You probably already have a brokerage account. Maybe some crypto. Maybe an apartment, maybe a savings account in a different currency, maybe a little cash. You think of your money as something you're trying to grow, not something you're trying to optimize.
  >
  > You are not a day trader. You don't want to be one. You don't need Sharpe ratios, you don't care about rebalancing algorithms, and you've never wanted a "portfolio analytics dashboard."
  >
  > You just want to know — honestly, monthly, in one number — whether the line is going up.
  >
  > If that's you, I built this for us.

#### 7. Signature + closing CTA

- **Signature line** in a slightly larger serif-adjacent treatment or italicized: *"— Vlad, building One Day Investor"*
- **CTA:** same Google sign-in button component used in `LandingHero` and `LandingFinalCta`. Button label: *"Sign in with Google"*. Background: reuses the gradient-card treatment from `LandingFinalCta` so the page closes with the same rhythm as the landing.

### Landing page changes

1. **`LandingNav.tsx`** — add a new nav link **"Philosophy"** next to the existing "Features" anchor. Uses `<Link to="/philosophy">` (client-side routing), same typography as Features. Visible on `md:` and above, matching the existing Features link behavior.

2. **`LandingPhilosophyCard.tsx`** (new component) — a full-width invitation card rendered between `<LandingFeatures />` and `<LandingHowItWorks />` in `LandingPage.tsx`.
   - Visual style: borrows the radial-gradient card treatment from `LandingFinalCta` but smaller (less vertical padding).
   - **Eyebrow:** `The idea`
   - **Headline:** *"New here? Read why I built this."*
   - **Subhead:** *"Two minutes. No sign-up. The philosophy behind One Day Investor."*
   - **Button:** *"Read the philosophy →"* as a `<Link to="/philosophy">` styled like the existing secondary button from `LandingHero` (border + transparent bg).

### Routing

- Add a new public route to `apps/frontend/src/main.tsx`:
  ```ts
  { path: "/philosophy", element: <PhilosophyPage /> }
  ```
- Placed at the public-route level (sibling of `/` and `/login`), *not* under `ProtectedRoute`.

### File layout

```
apps/frontend/src/
  pages/
    PhilosophyPage.tsx                    # new
  components/
    landing/
      LandingNav.tsx                       # edit: add Philosophy link
      LandingPhilosophyCard.tsx            # new
    philosophy/                            # new directory
      PhilosophyHero.tsx
      PhilosophyRitual.tsx                 # Section 2
      PhilosophyTwoGaps.tsx                # Section 3
      PhilosophyTheDeal.tsx                # Section 4
      PhilosophyPockets.tsx                # Section 5
      PhilosophyAudience.tsx               # Section 6
      PhilosophyClosing.tsx                # Section 7
      PullQuote.tsx                        # shared presentational component
```

Each section component is self-contained, text-heavy, and receives no props. `PullQuote.tsx` accepts `children` and renders a centered, large-typography quote with subtle emerald accents on either side.

### Accessibility

- `<a href="#main">Skip to content</a>` pattern matching `LandingPage.tsx`.
- Section landmarks: each section uses `<section>` with an `aria-labelledby` referencing its H2.
- Hero H1 is the single H1 on the page; all subsequent sections use H2.
- Pull quotes use `<blockquote>`.
- The sparkline in the hero is marked `aria-hidden="true"` (decorative).
- Color contrast: all body text uses `text-emerald-100` or `text-emerald-200/90` against the existing background, matching the already-shipped landing contrast.

### SEO and metadata

- `<title>` — *"Philosophy — One Day Investor"*
- `<meta name="description">` — *"A letter from the person building One Day Investor: invest one day a month, ignore the other thirty."*
- JSON-LD `Article` schema with `headline`, `author` (Person: Vlad), `datePublished`, `description`, `mainEntityOfPage`.

Metadata is set inline in `PhilosophyPage.tsx` using direct `document.title` assignment in a `useEffect` (matching whatever pattern the existing pages use — to be verified during implementation; add React Helmet only if no convention exists).

## Out of scope

- Monetization copy.
- Privacy/security deep-dive (a single honest sentence about "no bank integrations" appears in Section 4, nothing more).
- Reminder/retention mechanics.
- Reflection-mode feature descriptions.
- I18n / Russian translation (English only for now).
- Blog, changelog, team page.
- Animated scroll reveals (can be added later if the calm tone survives it).

## Open questions

None blocking. Content copy above is a solid draft; final wording can be polished during implementation.

## Testing

- Route `/philosophy` renders without auth.
- "Philosophy" nav link on the landing navigates correctly (client-side, no full reload).
- Invitation card on the landing renders between Features and How-it-Works and links to `/philosophy`.
- Signature's Google sign-in button navigates to `/login`.
- Skip-to-content link is keyboard-accessible.
- Mobile: all sections stack cleanly at `<640px`; the two-column cards become single-column; hero headline doesn't overflow.
- Lighthouse: accessibility ≥ 95, no regressions on landing Lighthouse scores.
