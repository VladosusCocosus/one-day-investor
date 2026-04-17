# Blog Chart Blocks — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Summary

Add a `chart` block type to the blog's JSON content system, rendered client-side with ApexCharts. Charts match the frontend app's emerald fintech design language. Update all existing posts with data visualizations.

## Block Schema

New entry in the `Block` union type:

```typescript
| {
    type: "chart";
    chartType: "bar" | "horizontal-bar" | "line" | "donut";
    heading?: string;
    caption?: string;
    height?: number;   // px, default 300
    data: {
      labels: string[];
      series: number[] | { name: string; values: number[] }[];
    };
    options?: {
      colors?: string[];
      suffix?: string;   // e.g. "%" or "bps"
      prefix?: string;   // e.g. "$" or "€"
      stacked?: boolean;
    };
  }
```

- **Simple series** (`number[]`) — one data series, labels on axis
- **Multi series** (`{ name, values }[]`) — grouped/stacked bars, multi-line charts

## Charting Library

**ApexCharts** (~125KB min+gz) loaded from CDN. Chosen for:
- Declarative JSON config maps directly to blog block storage
- All needed chart types (bar, horizontal bar, area, donut)
- Built-in tooltips, animations, responsive sizing
- CDN delivery — no build step changes needed

## Rendering Architecture

### Server Side (Kita HTML)

`ChartBlock` component in `components.tsx` renders:

```html
<section class="border-t border-emerald-900/40 px-6 py-8 md:px-8 md:py-12">
  <div class="mx-auto max-w-[760px]">
    <h2 class="text-xl font-semibold text-emerald-50">{heading}</h2>
    <div class="mt-6 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-6"
         data-chart='{JSON config}'
         style="height: {height}px;">
    </div>
    <p class="mt-3 text-center text-sm text-emerald-300/80">{caption}</p>
  </div>
</section>
```

Matches existing block styling: same section padding, max-width, border-top, heading treatment. Chart container uses same card style as `ComparisonBlock`.

### Client Side

Script injected in `post.tsx` only when chart blocks exist:

```javascript
const chartEls = document.querySelectorAll('[data-chart]');
if (chartEls.length > 0) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
  script.onload = function() { chartEls.forEach(initChart); };
  document.head.appendChild(script);
}
```

**Zero JS cost on pages without charts.**

`initChart` reads `data-chart` JSON, translates simplified schema to full ApexCharts config with emerald theme.

### Chart Type Mapping

| Blog chartType | ApexCharts type | Notes |
|---|---|---|
| `bar` | `bar` (vertical) | Rounded corners, gradient fill |
| `horizontal-bar` | `bar` (horizontal) | `plotOptions.bar.horizontal: true` |
| `line` | `area` | Gradient fill matching frontend area charts |
| `donut` | `donut` | Center label, custom legend below |

## Theme

Matching the frontend's emerald fintech palette:

```javascript
const CHART_COLORS = [
  "hsl(160, 84%, 25%)",  // emerald deep
  "hsl(160, 70%, 40%)",  // emerald mid
  "hsl(150, 60%, 55%)",  // green
  "hsl(170, 55%, 55%)",  // teal
  "hsl(145, 45%, 65%)",  // sage
  "hsl(175, 40%, 45%)",  // deep teal
];
```

Global ApexCharts theme config:
- Background: transparent (inherits blog's emerald-950)
- Tooltip: 8px radius, `border-emerald-900/50`, 12px font, dark bg
- Grid: dashed lines, `emerald-900/40`
- Axes: 11px, muted emerald text, no axis lines
- Donut: proportional innerRadius/outerRadius matching frontend
- Font: Inter (already loaded via Google Fonts CDN)

## Editor Integration

Add `chart` to the `SCHEMAS` object in `editor.tsx`:

```javascript
chart: {
  label: 'Chart',
  fields: [
    { path: 'chartType', label: 'Chart type', type: 'select',
      options: ['bar', 'horizontal-bar', 'line', 'donut'] },
    { path: 'heading', label: 'Heading', type: 'text' },
    { path: 'caption', label: 'Caption (source)', type: 'text' },
    { path: 'height', label: 'Height (px)', type: 'text' },
    { path: 'data.labels', label: 'Labels (one per line)', type: 'lines' },
    { path: 'data.series', label: 'Series (JSON)', type: 'textarea' },
    { path: 'options.colors', label: 'Colors (comma-separated hex)', type: 'text' },
    { path: 'options.suffix', label: 'Value suffix (e.g. %)', type: 'text' },
    { path: 'options.prefix', label: 'Value prefix (e.g. €)', type: 'text' },
  ],
  defaults: function() {
    return {
      type: 'chart', chartType: 'bar', heading: '', caption: '',
      height: 300,
      data: { labels: [], series: [] },
      options: { colors: [], suffix: '', prefix: '' },
    };
  },
}
```

Note: Editor needs two additions to the JS:
1. New field type `select` in `renderField` — renders a `<select>` element from an `options` array on the field definition
2. New field type `json` in `renderField` — renders a textarea that parses as JSON on change (for `data.series`). Falls back to raw string if parse fails, validated on form submit.

## Files Changed

| File | Change |
|------|--------|
| `packages/database/modules/blog/index.ts` | Add `chart` to `Block` union type |
| `apps/blog/src/components.tsx` | Add `ChartBlock` component + `renderBlock` case |
| `apps/blog/src/pages/post.tsx` | Add ApexCharts CDN script + `initChart` logic |
| `apps/blog/src/pages/editor.tsx` | Add `chart` schema + `select` field type to editor JS |
| Database (via SQL) | Update existing post content with chart blocks |

## Post Updates

### Post #7 — When One Day Isn't Enough (4 charts)

1. **Bar: "The Behavior Gap (2024)"** in "The Rule Still Stands"
   - Labels: Avg Investor, S&P 500
   - Series: [16.54, 25.02]
   - Colors: #ef4444, #10b981
   - Suffix: %

2. **Donut: "S&P 500 Corrections Since 1974"** in Exception 2
   - Labels: Recovered, Became Bear Markets
   - Series: [21, 6]
   - Colors: #10b981, #ef4444

3. **Horizontal bar: "Tax Alpha by Period (MIT Study)"** in Exception 3
   - Labels: 1926-1949, 1949-1972, 1972-1995, 1995-2018
   - Series: [2.29, 0.57, 1.04, 0.83]
   - Suffix: %

4. **Bar: "Health Insurance Cost Increase 2026"** in Exception 4
   - Labels: Employee Premium, Total Employer Cost
   - Series: [7, 9]
   - Colors: #3b82f6, #1e40af
   - Suffix: %

### Post #6 — Monthly Portfolio Check (2 charts)

5. **Bar: "The Behavior Gap (2024)"** in "Why Monthly?"
   - Same as chart #1

6. **Bar: "Active Traders vs Market"** in "What NOT to Do"
   - Labels: Most Active Traders, Market Return
   - Series: [11.4, 17.9]
   - Colors: #ef4444, #10b981
   - Suffix: %

### Post #5 — Why Investing Apps Make You Trade More

7. Review content during implementation for chart opportunities

### Post #4 — Frequent Checking Reduces Returns

8. **Bar: "Chance of Seeing a Loss"** in myopic loss aversion section
   - Labels: Daily Checking, Quarterly Checking
   - Series: [25, 12]
   - Colors: #ef4444, #10b981
   - Suffix: %

## Verification

- [ ] JSON with chart blocks is valid and parseable
- [ ] Charts render on post pages with correct data
- [ ] Zero JS loaded on pages without charts
- [ ] Editor can create/edit chart blocks
- [ ] Theme matches frontend emerald palette
- [ ] Responsive on mobile
- [ ] Tooltips show formatted values with prefix/suffix
