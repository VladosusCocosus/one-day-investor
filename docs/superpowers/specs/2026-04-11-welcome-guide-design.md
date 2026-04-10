# Welcome Guide — Design Spec

**Date:** 2026-04-11
**Author:** Vlad
**Status:** Approved, ready for implementation plan
**Branch:** `feat/philosophy-page` (extends the same branch that introduces the Philosophy page — both deliverables ship together)

## Summary

Add a first-time user guide to One Day Investor in two complementary places:

1. **Landing page:** replace the existing 3-step `LandingHowItWorks` section with a richer 6-card "editorial story spine" guide that walks an anonymous visitor through the full rhythm of the product.
2. **Welcome overlay:** a one-time modal that appears on the user's first authenticated visit to the Dashboard, stepping through the same 6-step narrative with `Next / Next / Next` navigation, then dismissing into the real app.

Content is derived from `docs/brainstorm/README.md`. Both pieces share the same 6-step narrative but live in different theme contexts: the landing section uses the existing dark emerald landing theme; the overlay uses the light theme of the protected app.

The existing `/philosophy` page (already designed in `2026-04-10-philosophy-page-design.md`) is **not touched**. It ships as already planned. No new `/guide` or `/how-it-works` page is introduced.

## Goals

- Give first-time visitors on the marketing site a clear, complete picture of the product's rhythm — not just three steps, but the full "six-beat" story that includes the monthly habit and the philosophy of watching a curve instead of a ticker.
- Give first-time authenticated users a warm, guided landing inside the app so they understand what to do next instead of staring at an empty Dashboard.
- Preserve continuity: the landing section and the in-app overlay tell the same story with the same numbering and the same card titles, so a user who reads both doesn't feel they contradict or duplicate.
- Keep the philosophy page untouched and intact — it is the "why", not the "how".

## Non-Goals

- A dedicated in-app `/guide` or `/how-it-works` page — rejected. The existing `/philosophy` page already occupies the "long-form content page" slot, and an overlay is a better fit for one-time onboarding.
- A full product tour with element-anchored tooltips (Shepherd.js, react-joyride) — rejected. Plain modal with Next/Back is sufficient.
- An active onboarding workflow that detects whether the user actually created a pocket / added an asset / took a snapshot before advancing — rejected. Pure passive click-through.
- Backend persistence of the "seen" flag — rejected. `localStorage` is sufficient for a welcome prompt.
- i18n / Russian translation — English only, matching the rest of the app and the landing.
- Replaying the overlay automatically on schedule, or any form of re-prompting — once dismissed, it only returns when explicitly triggered by the user from Profile.
- Animated scroll reveals or elaborate motion on the landing spine — static is fine for the first version.

## User Stories

- **As a first-time visitor** on the landing page, I scroll past the hero and features, reach the "How it works" section, and see a clear, sequential 6-card walkthrough laid out as an editorial story spine. I understand the rhythm — pockets → assets → snapshot → monthly → curve → habit — before I sign up.
- **As a newly signed-up user** opening the app for the first time, I see a welcome modal over the Dashboard that walks me through the same 6 steps with Next/Back controls. I click through at my own pace, dismiss at the end, and land on a clear starting place to create my first pocket. The modal never shows again unless I explicitly ask for it.
- **As a returning user** who dismissed the welcome overlay weeks ago and forgot what it said, I can go to my Profile page and click "Show welcome tour" to reopen it.
- **As a user on a different browser** where I have not yet seen the welcome overlay, I see it once on my first Dashboard load there, since persistence is per-browser `localStorage`.

## Design

### Voice

Short, direct, plain-English prose. Second-person address ("Create a pocket", "Come back once a month"). No jargon, no finance-speak. All copy in English.

### Visual approach

- **Landing section:** dark emerald theme matching the rest of the landing (`LandingHero`, `LandingFeatures`, `LandingFinalCta`). Eyebrow + H2 + italic intro line above the spine, then six cards alternating left/right around a vertical spine.
- **Welcome overlay:** light theme matching the protected app (`bg-[#f8fafc]`, `text-slate-*`, emerald-700 accents). Two-pane modal — gradient visual pane on the left, text content pane on the right. Focus-trapped, dismissable, ESC-aware.

### Shared content — the 6 steps

Both deliverables share the exact same six card titles, numbering, and general narrative. The landing version uses short 1-line summaries; the overlay version uses extended 2-paragraph bodies.

| # | Title | Landing (1-liner) | Overlay (extended) |
|---|---|---|---|
| 1 | **Create a pocket** | Group by how you think: Revolut, IB, Cash, Home. | A pocket is wherever you mentally keep a chunk of money — Revolut, Interactive Brokers, your apartment, cash in your drawer. Make one per service or per thing; the structure should match how you already think about your money.<br><br>Don't worry about getting it right the first time. You can split, rename, or merge pockets later. |
| 2 | **Add your assets** | Stocks auto-price. Real estate and cash you set. | Fill each pocket with what's inside: stocks, cash, crypto, real estate, cars, whatever counts. Exchange rates and market prices update automatically — everything else you write down once.<br><br>If an asset doesn't have a public price (an apartment, a Lego collection, a car), you set the number. The app trusts you to know your own stuff. |
| 3 | **Take your first snapshot** | The monthly photo of your net worth. | A snapshot is a monthly photograph of your entire net worth. One click captures the whole picture, and the totals stay fixed even as prices move later.<br><br>You'll end up with one snapshot per month. That's the building block of your timeline. |
| 4 | **Come back once a month** | We'll email you. Five minutes, then close the tab. | We'll email you a gentle reminder when it's time. Five minutes in the app, update the numbers that changed, click "snapshot". Then close the tab and live your life.<br><br>That's the whole ritual. Not daily. Not weekly. One day a month. |
| 5 | **See the curve, not the ticker** | Your capital over years, not yesterday's dip. | The Dashboard shows your net worth over months and years — the one chart that actually matters. Not yesterday's 0.3% dip. Not minute-by-minute market noise.<br><br>The slow, honest line that tells you where your capital is really going. |
| 6 | **Build the habit** | Twelve snapshots a year. A decade of your story. | Twelve snapshots a year, and then another twelve, and another. A decade of snapshots is a decade of your financial story in one honest line.<br><br>No bank, no broker, no spreadsheet can show you that — they don't live long enough. One Day Investor does. |

Philosophy intro line, used on the landing section only (italic paragraph above the spine, under the H2):

> *"One day a month. That's all it takes to watch your capital grow."*

The overlay does not repeat the line — its left pane already uses a simple `Welcome` eyebrow above the step icon, and the per-step titles carry the same philosophy implicitly.

### Deliverable 1 — Landing page: `LandingGuide` section

#### What ships

- A new component `LandingGuide.tsx` under `apps/frontend/src/components/landing/`.
- The old `LandingHowItWorks.tsx` is **deleted**.
- `LandingPage.tsx` is edited to render `<LandingGuide />` in the exact slot where `<LandingHowItWorks />` previously lived (between `<LandingFeatures />` / `<LandingPhilosophyCard />` from the philosophy spec and `<LandingFinalCta />`).
- The `#how` anchor id currently set by `LandingHowItWorks` moves to `LandingGuide` so the nav link from `LandingNav` continues to work.

#### Structure

```
<section id="how" …>
  <div class="mx-auto max-w-[1200px]">
    <div class="text-center">
      <p class="eyebrow">How it works</p>
      <h2>Invest one day a month. Here's the whole rhythm.</h2>
      <p class="italic">"One day a month. That's all it takes to watch your capital grow."</p>
    </div>
    <ol class="mt-16">
      {steps.map((step, i) => (
        <li class="spine-row [side alternating]">
          {/* left column card (even indices) */}
          {/* center spine node — circular, numbered, emerald-ringed */}
          {/* right column card (odd indices) */}
        </li>
      ))}
    </ol>
  </div>
</section>
```

#### Layout and styling

- Desktop (`md:` and up):
  - 3-column grid: `1fr 56px 1fr`. Cards live in column 1 for odd steps, column 3 for even steps, with an empty ghost in the other column. The middle column renders the spine and the numbered node.
  - A vertical spine is drawn with a pseudo-element on the `<ol>`: `::before { position:absolute; top:0; bottom:0; left:50%; width:2px; background: linear-gradient(to bottom, transparent, rgba(110,231,183,0.35) 8%, rgba(110,231,183,0.35) 92%, transparent) }`.
  - The circular spine node for each step is `w-9 h-9 rounded-full bg-[#022c22] border-2 border-emerald-300 text-emerald-300 font-bold text-sm flex items-center justify-center z-10`.
  - Cards use `rounded-2xl border border-emerald-900/50 bg-emerald-950/40` to match the existing landing features grid.
  - Card content: a small eyebrow `Step N`, H3 title, single paragraph body.
- Mobile (`<md`):
  - The grid collapses to a single column with the spine running down the left edge (`left: 1.25rem` instead of `50%`), cards all left-aligned, numbered nodes hugging the spine.
  - All cards stack vertically in their natural order.

#### Accessibility

- Section uses `<section id="how" aria-labelledby="guide-heading">` with an `<h2 id="guide-heading">`.
- The 6-step list uses `<ol>` so screen readers announce the ordering. Each step is `<li>`.
- The spine pseudo-element is decorative; no extra markup.
- Card content remains in DOM order (1, 2, 3, 4, 5, 6) regardless of left/right visual alternation — the alternation is purely via CSS grid column placement, not DOM order.
- Step number nodes are `aria-hidden` so screen readers don't double-announce the number with the eyebrow text.

### Deliverable 2 — `WelcomeOverlay` component

#### What ships

- A new component `WelcomeOverlay.tsx` under `apps/frontend/src/components/`.
- Used by `DashboardPage.tsx`: the page mounts the overlay conditionally based on the localStorage flag.
- A small "Show welcome tour" button added to `ProfilePage.tsx` (footer area, below existing content) that resets the flag and re-opens the overlay. If the Profile page has a natural "About" / "Help" section already, the button goes there; otherwise a new small section titled "Help" with just this one button.

#### Trigger logic

```ts
// Pseudocode, not final
const STORAGE_KEY = "odi.welcome-overlay.seen";

function DashboardPage() {
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "true") {
      setOverlayOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOverlayOpen(false);
  };

  return (
    <>
      <WelcomeOverlay open={overlayOpen} onDismiss={handleDismiss} />
      {/* existing Dashboard content */}
    </>
  );
}
```

The overlay does not block Dashboard rendering — the Dashboard mounts normally underneath, so when the overlay is dismissed, the user immediately sees the real app.

#### Structure and layout

Built on top of the existing shadcn `Dialog` primitive already present in the codebase (same primitive used by the drawers in `AssetDrawer.tsx`, `PocketDrawer.tsx`).

```
<Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogContent className="w-[720px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden rounded-2xl">
    <div class="grid grid-cols-[280px_1fr] min-h-[380px]">
      {/* LEFT — visual pane */}
      <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 flex flex-col justify-between border-r border-emerald-200">
        <div>
          <span class="eyebrow">Welcome</span>
          <div class="big-icon">{currentStep.icon}</div>
        </div>
        <ol class="mini-step-map">
          {steps.map((s, i) => <li class={i === current ? "active" : ""}>
            <span class="n">{i + 1}</span>{s.shortTitle}
          </li>)}
        </ol>
      </div>
      {/* RIGHT — content pane */}
      <div class="p-8 flex flex-col justify-between">
        <button class="close-x" onClick={handleDismiss}>×</button>
        <div>
          <span class="badge">Step {current + 1} of 6</span>
          <h3 class="modal-title">{currentStep.title}</h3>
          <p class="modal-body">{currentStep.body[0]}</p>
          <p class="modal-body">{currentStep.body[1]}</p>
        </div>
        <div class="controls">
          <Button variant="ghost" disabled={current === 0} onClick={prev}>← Back</Button>
          <Button onClick={next}>
            {current === 5 ? "Get started →" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

#### Step state

- `const [current, setCurrent] = useState(0)` drives which step is shown. Back decrements; Next increments. On step 6, Next becomes "Get started →" and, when clicked, calls `handleDismiss()` and then `navigate("/profile")` so the user lands on the Profile page where they can create their first pocket.
- Keyboard: `ArrowRight` / `Enter` advances, `ArrowLeft` goes back, `ESC` dismisses (handled by the shadcn Dialog primitive). `Tab` / `Shift+Tab` cycles through focusable elements inside the dialog.
- Icons per step: pick one lucide icon per step at implementation time. Suggested mapping: Wallet → Create a pocket, Layers → Add your assets, Camera → Take your first snapshot, CalendarDays → Come back once a month, LineChart → See the curve, Repeat → Build the habit. Final mapping is a detail during implementation.

#### Dismissal paths

No separate "Skip" link is rendered — the × button in the top-right of the content pane, `ESC`, and outside-click are sufficient dismissal affordances. The controls row only contains Back / Next. All of the following set the localStorage flag and close the overlay:

1. Click the × button in the top-right of the content pane.
2. Press `ESC`.
3. Click outside the dialog (shadcn Dialog default behavior).
4. Click the "Get started →" button on step 6.

#### Replay

- On `ProfilePage.tsx`, add a small "Help" section with a single button: "Show welcome tour". Clicking it:
  1. Calls `localStorage.removeItem("odi.welcome-overlay.seen")`.
  2. Navigates to `/dashboard`.
  3. The Dashboard mounts, reads the (now-absent) flag, and opens the overlay from step 1 again.
- This indirect path keeps `WelcomeOverlay` scoped to Dashboard and avoids mounting it on Profile.

#### Accessibility

- The shadcn `Dialog` primitive handles focus trap, ESC, and backdrop click out of the box.
- `DialogContent` is given `aria-labelledby` pointing at the `modal-title` H3 element.
- `DialogContent` is given `aria-describedby` pointing at the first paragraph.
- Mini step-map on the left is an `<ol>`; active item is marked with `aria-current="step"`.
- `aria-live="polite"` on the content pane's title/body so screen readers re-announce when the user clicks Next.
- Color contrast: all body text uses `text-slate-700` against the white content pane; the gradient visual pane uses `text-emerald-900` against the emerald-50/100 gradient.

### File layout

```
apps/frontend/src/
  components/
    landing/
      LandingHowItWorks.tsx        # DELETED
      LandingGuide.tsx              # NEW — replaces LandingHowItWorks, holds its own short-form step copy
    WelcomeOverlay.tsx              # NEW — single file, holds its own long-form step copy
  pages/
    DashboardPage.tsx               # EDIT — mount WelcomeOverlay conditionally
    ProfilePage.tsx                 # EDIT — add Help section with "Show welcome tour" button
    LandingPage.tsx                 # EDIT — swap LandingHowItWorks → LandingGuide import and render
```

Step copy is deliberately not extracted to a shared file. The landing cards use 1-line summaries and the overlay uses 2-paragraph bodies — different shapes, different tones, and the risk of over-abstracting small amounts of static copy outweighs the benefit of a shared module. Each component keeps its own inline `steps` array.

### Routing

No routing changes. No new routes added.

### SEO and metadata

- Landing page metadata is unchanged — the section slot is replaced in place.
- No metadata is added for the overlay (it is not a page).

## Out of scope

- New in-app route (`/guide`, `/how-it-works`, etc.) — explicitly rejected in brainstorm.
- Backend storage of "seen" flag.
- Reminder emails triggered after overlay dismissal.
- Reflection-mode or philosophy page changes — both separate.
- Analytics / event tracking on the overlay steps.
- Animated transitions between steps (a `transition-opacity` fade is fine; no complex spring animations).
- i18n / translation of the step copy.

## Open questions

None blocking. The final lucide icon picks per step and the exact placement of the "Show welcome tour" button inside `ProfilePage.tsx` are both minor implementation details that do not affect the spec.

## Testing

- Landing page renders the new "How it works" section with the 6-card spine; old `LandingHowItWorks.tsx` is removed.
- The landing spine layout alternates sides correctly at `md:` and collapses to a single column at `<md`.
- `#how` anchor still navigates to the new section from `LandingNav`.
- A newly authenticated user loading the Dashboard for the first time sees the welcome overlay.
- The overlay advances through all 6 steps via Next, goes back via Back, and dismisses via × / ESC / outside-click / "Get started".
- After dismissal, `localStorage.getItem("odi.welcome-overlay.seen") === "true"`.
- Reloading the Dashboard does not re-open the overlay.
- Clicking "Show welcome tour" in Profile navigates to Dashboard and re-opens the overlay from step 1.
- The overlay is keyboard-accessible: Tab cycles focusable elements, ArrowRight advances, ESC dismisses.
- On step 6, clicking "Get started →" dismisses the overlay and navigates to `/profile`.
- The Dashboard renders its normal content underneath the overlay (no layout shift on dismissal).
- Lighthouse accessibility score does not regress on either the landing or the Dashboard pages.
