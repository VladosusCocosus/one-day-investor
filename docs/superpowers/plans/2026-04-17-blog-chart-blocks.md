# Blog Chart Blocks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `chart` block type to the blog, rendered client-side with ApexCharts using the emerald fintech theme, and update all 4 published posts with data visualizations.

**Architecture:** Server renders a `<div data-chart="...">` placeholder per chart block. A client-side script lazy-loads ApexCharts from CDN only on pages with charts, reads the JSON config from each `data-chart` attribute, and initializes each chart with the emerald theme. Editor gets a new `chart` block type with `select` and `json` field types.

**Tech Stack:** Elysia + Kita HTML (SSR), ApexCharts (CDN), PostgreSQL (content storage), vanilla JS (client init)

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/database/modules/blog/index.ts` | `Block` union type — add `chart` variant |
| `apps/blog/src/components.tsx` | `ChartBlock` component + `renderBlock` case |
| `apps/blog/src/pages/post.tsx` | ApexCharts CDN loader + `initChart` script |
| `apps/blog/src/pages/editor.tsx` | `chart` schema + `select`/`json` field types in editor JS |

---

### Task 1: Add Chart to Block Type

**Files:**
- Modify: `packages/database/modules/blog/index.ts:3-18`

- [ ] **Step 1: Add chart variant to Block union**

In `packages/database/modules/blog/index.ts`, add the chart type to the `Block` union. After the existing `markdown` type (line 18), add:

```typescript
  | {
      type: "chart";
      chartType: "bar" | "horizontal-bar" | "line" | "donut";
      heading?: string;
      caption?: string;
      height?: number;
      data: {
        labels: string[];
        series: number[] | { name: string; values: number[] }[];
      };
      options?: {
        colors?: string[];
        suffix?: string;
        prefix?: string;
        stacked?: boolean;
      };
    };
```

The full `Block` type after this change should end with `| { type: "markdown"; ... } | { type: "chart"; ... };`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pavel/Projects/one-day-investor && npx tsc --noEmit -p apps/blog/tsconfig.json 2>&1 | head -20`

Expected: No errors (or only pre-existing ones unrelated to chart). The new type is additive — no existing code references it yet.

- [ ] **Step 3: Commit**

```bash
git add packages/database/modules/blog/index.ts
git commit -m "feat(blog): add chart variant to Block union type"
```

---

### Task 2: ChartBlock Server Component

**Files:**
- Modify: `apps/blog/src/components.tsx`

- [ ] **Step 1: Add ChartBlock component**

In `apps/blog/src/components.tsx`, add the `ChartBlock` component after the `MarkdownBlock` function (before `renderBlock`):

```tsx
export function ChartBlock({
  chartType,
  heading,
  caption,
  height,
  data,
  options,
}: {
  chartType: string;
  heading?: string;
  caption?: string;
  height?: number;
  data: { labels: string[]; series: unknown };
  options?: { colors?: string[]; suffix?: string; prefix?: string; stacked?: boolean };
}) {
  const chartConfig = JSON.stringify({ chartType, data, options }).replace(/</g, "\\u003c");
  const h = height || 300;

  return (
    <section class="border-t border-emerald-900/40 px-6 py-8 md:px-8 md:py-12">
      <div class="mx-auto max-w-[760px]">
        {heading && (
          <h2 class="text-xl font-semibold tracking-tight text-emerald-50">
            {heading}
          </h2>
        )}
        <div
          class="mt-6 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-4 md:p-6"
          data-chart={chartConfig}
          style={`height:${h}px`}
        ></div>
        {caption && (
          <p class="mt-3 text-center text-sm text-emerald-300/80">{caption}</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add chart case to renderBlock**

In the `renderBlock` function's switch statement, add before the `default` case:

```tsx
    case "chart":
      return (
        <ChartBlock
          chartType={block.chartType}
          heading={block.heading}
          caption={block.caption}
          height={block.height}
          data={block.data}
          options={block.options}
        />
      );
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/pavel/Projects/one-day-investor && npx tsc --noEmit -p apps/blog/tsconfig.json 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/blog/src/components.tsx
git commit -m "feat(blog): add ChartBlock server component"
```

---

### Task 3: Client-Side ApexCharts Init Script

**Files:**
- Modify: `apps/blog/src/pages/post.tsx`

- [ ] **Step 1: Add hasCharts check and chart init script**

In `apps/blog/src/pages/post.tsx`, inside the `PostPage` function, add a check before the return:

```tsx
  const hasCharts = post.content.some((block) => block.type === "chart");
```

Then, inside the `<Layout>` return, after the existing `<script>` block (the like button script, ends around line 164), add:

```tsx
      {hasCharts && (
        <script>
          {`
          (function() {
            var COLORS = [
              "hsl(160,84%,25%)","hsl(160,70%,40%)","hsl(150,60%,55%)",
              "hsl(170,55%,55%)","hsl(145,45%,65%)","hsl(175,40%,45%)"
            ];

            var baseTheme = {
              chart: {
                background: "transparent",
                fontFamily: "Inter, system-ui, sans-serif",
                toolbar: { show: false },
                animations: { enabled: true, easing: "easeinout", speed: 600 },
              },
              grid: {
                borderColor: "rgba(16,185,129,0.15)",
                strokeDashArray: 4,
              },
              tooltip: {
                theme: "dark",
                style: { fontSize: "12px" },
                y: {},
              },
              xaxis: {
                labels: { style: { colors: "rgba(167,198,185,0.7)", fontSize: "11px" } },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: {
                labels: { style: { colors: "rgba(167,198,185,0.7)", fontSize: "11px" } },
              },
              legend: {
                labels: { colors: "rgba(167,198,185,0.9)" },
                fontSize: "12px",
              },
              dataLabels: { enabled: false },
            };

            function buildOptions(cfg) {
              var labels = cfg.data.labels || [];
              var rawSeries = cfg.data.series || [];
              var opts = cfg.options || {};
              var colors = opts.colors && opts.colors.length > 0 ? opts.colors : COLORS;
              var suffix = opts.suffix || "";
              var prefix = opts.prefix || "";

              var apexOpts = JSON.parse(JSON.stringify(baseTheme));
              apexOpts.colors = colors;
              apexOpts.tooltip.y.formatter = function(val) {
                return prefix + val + suffix;
              };

              if (cfg.chartType === "donut") {
                apexOpts.chart.type = "donut";
                apexOpts.labels = labels;
                apexOpts.series = rawSeries;
                apexOpts.plotOptions = {
                  pie: {
                    donut: {
                      size: "65%",
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: "Total",
                          color: "rgba(167,198,185,0.7)",
                          fontSize: "11px",
                          formatter: function(w) {
                            return w.globals.seriesTotals.reduce(function(a,b){return a+b},0);
                          },
                        },
                        value: {
                          color: "#ecfdf5",
                          fontSize: "20px",
                          fontWeight: 600,
                        },
                      },
                    },
                  },
                };
                apexOpts.stroke = { width: 2, colors: ["rgba(2,40,28,1)"] };
                apexOpts.legend.position = "bottom";
                return apexOpts;
              }

              // Bar or horizontal-bar
              if (cfg.chartType === "bar" || cfg.chartType === "horizontal-bar") {
                apexOpts.chart.type = "bar";
                apexOpts.xaxis.categories = labels;
                apexOpts.plotOptions = {
                  bar: {
                    horizontal: cfg.chartType === "horizontal-bar",
                    borderRadius: 4,
                    columnWidth: "55%",
                    barHeight: "60%",
                    distributed: Array.isArray(rawSeries) && typeof rawSeries[0] === "number",
                  },
                };

                if (Array.isArray(rawSeries) && typeof rawSeries[0] === "number") {
                  apexOpts.series = [{ name: "Value", data: rawSeries }];
                } else {
                  apexOpts.series = rawSeries.map(function(s) {
                    return { name: s.name, data: s.values };
                  });
                  if (opts.stacked) apexOpts.chart.stacked = true;
                }

                if (apexOpts.plotOptions.bar.distributed) {
                  apexOpts.legend.show = false;
                }

                if (cfg.chartType === "horizontal-bar") {
                  apexOpts.yaxis.labels.style = { colors: "rgba(167,198,185,0.7)", fontSize: "11px" };
                }

                return apexOpts;
              }

              // Line (rendered as area)
              if (cfg.chartType === "line") {
                apexOpts.chart.type = "area";
                apexOpts.xaxis.categories = labels;
                apexOpts.stroke = { curve: "smooth", width: 2 };
                apexOpts.fill = {
                  type: "gradient",
                  gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] },
                };

                if (Array.isArray(rawSeries) && typeof rawSeries[0] === "number") {
                  apexOpts.series = [{ name: "Value", data: rawSeries }];
                } else {
                  apexOpts.series = rawSeries.map(function(s) {
                    return { name: s.name, data: s.values };
                  });
                }
                return apexOpts;
              }

              return apexOpts;
            }

            function initChart(el) {
              try {
                var cfg = JSON.parse(el.getAttribute("data-chart"));
                var opts = buildOptions(cfg);
                var chart = new ApexCharts(el, opts);
                chart.render();
              } catch(e) {
                console.error("Chart init failed:", e);
                el.innerHTML = '<p style="text-align:center;color:rgba(167,198,185,0.5);padding:2rem;">Chart failed to load</p>';
              }
            }

            var els = document.querySelectorAll("[data-chart]");
            if (els.length > 0) {
              var s = document.createElement("script");
              s.src = "https://cdn.jsdelivr.net/npm/apexcharts@3/dist/apexcharts.min.js";
              s.onload = function() { els.forEach(initChart); };
              s.onerror = function() {
                els.forEach(function(el) {
                  el.innerHTML = '<p style="text-align:center;color:rgba(167,198,185,0.5);padding:2rem;">Chart failed to load</p>';
                });
              };
              document.head.appendChild(s);
            }
          })();
          `}
        </script>
      )}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pavel/Projects/one-day-investor && npx tsc --noEmit -p apps/blog/tsconfig.json 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/blog/src/pages/post.tsx
git commit -m "feat(blog): add client-side ApexCharts init with emerald theme"
```

---

### Task 4: Editor Chart Schema

**Files:**
- Modify: `apps/blog/src/pages/editor.tsx`

- [ ] **Step 1: Add select field type to renderField**

In `apps/blog/src/pages/editor.tsx`, inside the `renderField` function (inside the `<script>` block), after the `if (field.type === 'lines')` block, add:

```javascript
              if (field.type === 'select') {
                var optHtml = '';
                var fieldOpts = field.options || [];
                for (var oi = 0; oi < fieldOpts.length; oi++) {
                  optHtml += '<option value="' + escAttr(fieldOpts[oi]) + '"' + (fieldOpts[oi] === value ? ' selected' : '') + '>' + escText(fieldOpts[oi]) + '</option>';
                }
                return labelHtml + '<select id="' + id + '" class="' + baseCls + '" onchange="' + setCall + '">' + optHtml + '</select>';
              }
              if (field.type === 'json') {
                var jsonText = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                return labelHtml + '<textarea id="' + id + '" rows="4" class="' + baseCls + ' resize-y font-mono text-xs" oninput="blockEditor.setJson(' + idx + ', \\'' + field.path + '\\', this.value)">' + escText(jsonText) + '</textarea>';
              }
```

- [ ] **Step 2: Add setJson method to blockEditor**

In the `window.blockEditor` object (same `<script>` block), after the `setLines` method, add:

```javascript
              setJson: function(idx, path, value) {
                if (!blocks[idx]) return;
                try {
                  setPath(blocks[idx], path, JSON.parse(value));
                } catch(e) {
                  // Keep raw string until valid JSON is entered
                }
              },
```

- [ ] **Step 3: Add chart schema to SCHEMAS object**

In the `SCHEMAS` object (same `<script>` block), after the `markdown` schema entry, add:

```javascript
              chart: {
                label: 'Chart',
                fields: [
                  { path: 'chartType', label: 'Chart type', type: 'select', options: ['bar', 'horizontal-bar', 'line', 'donut'] },
                  { path: 'heading', label: 'Heading', type: 'text' },
                  { path: 'caption', label: 'Caption (source)', type: 'text' },
                  { path: 'height', label: 'Height (px)', type: 'text' },
                  { path: 'data.labels', label: 'Labels (one per line)', type: 'lines' },
                  { path: 'data.series', label: 'Series (JSON array)', type: 'json' },
                  { path: 'options.colors', label: 'Colors (JSON array of hex)', type: 'json' },
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
              },
```

- [ ] **Step 4: Add chart option to the block type dropdown**

In the `EditorFormPage` JSX, find the `<select id="new-block-type">` element (around line 197-207). Add a new option after the markdown option:

```html
<option value="chart">Chart</option>
```

- [ ] **Step 5: Verify the blog app starts**

Run: `cd /Users/pavel/Projects/one-day-investor && bun run --filter blog dev &` then check http://localhost:3001/editor (or whatever port the blog runs on). Verify the "Chart" option appears in the block type dropdown.

Kill the dev server after verifying.

- [ ] **Step 6: Commit**

```bash
git add apps/blog/src/pages/editor.tsx
git commit -m "feat(blog): add chart block to editor with select and json field types"
```

---

### Task 5: Add Charts to Post #4 (Frequent Checking)

**Files:**
- Database update via SQL

Post #4 block structure:
- Block 0: hero
- Block 1: prose (intro)
- Block 2: markdown "Theoretical Background: Myopic Loss Aversion"
- Block 3: markdown "Empirical Evidence"
- ...

Insert chart after block 2 (Myopic Loss Aversion), which discusses daily vs quarterly checking.

- [ ] **Step 1: Insert chart block into post #4**

Run this SQL via the local database:

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{
      "type": "chart",
      "chartType": "bar",
      "heading": "Chance of Seeing a Moderate Loss",
      "caption": "Source: Benartzi & Thaler (1995), OnePortfolio analysis",
      "height": 300,
      "data": {
        "labels": ["Daily Checking", "Quarterly Checking"],
        "series": [25, 12]
      },
      "options": {
        "colors": ["#ef4444", "#10b981"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 4
),
updated_at = now()
WHERE id = 4;
EOSQL
```

- [ ] **Step 2: Verify the content is valid**

```bash
docker exec one-day-investor-postgres-1 psql -U postgres -d blog -t -A -c "SELECT content FROM posts WHERE id = 4;" | python3 -m json.tool > /dev/null && echo "Valid JSON"
```

Expected: `Valid JSON`

- [ ] **Step 3: Commit a record of the change**

Create `docs/brainstorm/blog-chart-updates.sql` with all chart SQL updates (will be appended in subsequent tasks):

```bash
cat > docs/brainstorm/blog-chart-updates.sql <<'EOSQL'
-- Chart block additions to existing posts
-- Run against blog database

-- Post #4: Frequent Checking Reduces Returns
-- Insert bar chart after "Theoretical Background" section (position 3)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{"type":"chart","chartType":"bar","heading":"Chance of Seeing a Moderate Loss","caption":"Source: Benartzi & Thaler (1995), OnePortfolio analysis","height":300,"data":{"labels":["Daily Checking","Quarterly Checking"],"series":[25,12]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 4
),
updated_at = now()
WHERE id = 4;
EOSQL
```

```bash
git add docs/brainstorm/blog-chart-updates.sql
git commit -m "feat(blog): add chart to post #4 — loss visibility by checking frequency"
```

---

### Task 6: Add Charts to Post #5 (Investing Apps)

**Files:**
- Database update via SQL
- Append to: `docs/brainstorm/blog-chart-updates.sql`

Post #5 block structure:
- Block 0: hero
- Block 1: prose (intro)
- Block 2: markdown "How Brokers Actually Make Money" — PFOF data
- Block 3: markdown "The Design Patterns"
- Block 4: markdown "The Numbers Don't Lie" — DALBAR data

Insert chart after block 2 (PFOF revenue breakdown), and after block 5 (which was block 4 before first insert — DALBAR data).

- [ ] **Step 1: Insert PFOF revenue chart after block 2**

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{
      "type": "chart",
      "chartType": "donut",
      "heading": "Robinhood Revenue Breakdown (2021)",
      "caption": "Source: Business of Apps",
      "height": 320,
      "data": {
        "labels": ["Transaction-Based (PFOF)", "Other Revenue"],
        "series": [77, 23]
      },
      "options": {
        "colors": ["#ef4444", "#10b981"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 5
),
updated_at = now()
WHERE id = 5;
EOSQL
```

- [ ] **Step 2: Insert DALBAR behavior gap chart after "The Numbers Don't Lie" section**

After the first insert, "The Numbers Don't Lie" is now at index 5. Insert chart at position 6:

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{6}',
    '{
      "type": "chart",
      "chartType": "bar",
      "heading": "The Behavior Gap (2024)",
      "caption": "Source: DALBAR Quantitative Analysis of Investor Behavior",
      "height": 300,
      "data": {
        "labels": ["Average Investor", "S&P 500"],
        "series": [16.54, 25.02]
      },
      "options": {
        "colors": ["#ef4444", "#10b981"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 5
),
updated_at = now()
WHERE id = 5;
EOSQL
```

- [ ] **Step 3: Verify**

```bash
docker exec one-day-investor-postgres-1 psql -U postgres -d blog -t -A -c "SELECT content FROM posts WHERE id = 5;" | python3 -c "
import sys, json
data = json.loads(sys.stdin.read().strip())
for i, b in enumerate(data):
    print(f'{i}: [{b[\"type\"]}] {b.get(\"heading\", b.get(\"title\", b.get(\"chartType\", \"\")))}')
"
```

Expected: 11 blocks total, chart blocks at positions 3 and 6.

- [ ] **Step 4: Append SQL and commit**

Append the SQL for post #5 to `docs/brainstorm/blog-chart-updates.sql`, then:

```bash
git add docs/brainstorm/blog-chart-updates.sql
git commit -m "feat(blog): add charts to post #5 — PFOF donut + DALBAR bar"
```

---

### Task 7: Add Charts to Post #6 (Monthly Check)

**Files:**
- Database update via SQL
- Append to: `docs/brainstorm/blog-chart-updates.sql`

Post #6 block structure:
- Block 0: hero
- Block 1: prose (intro)
- Block 2: markdown "Why Monthly?" — DALBAR data
- Block 3: markdown "The 15-Minute Routine"
- Block 4: markdown "What NOT to Do" — Barber & Odean active traders data

Insert chart after block 2 ("Why Monthly?"), and after block 5 (which was block 4 before first insert — "What NOT to Do").

- [ ] **Step 1: Insert DALBAR chart after "Why Monthly?"**

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{
      "type": "chart",
      "chartType": "bar",
      "heading": "The Behavior Gap (2024)",
      "caption": "Source: DALBAR Quantitative Analysis of Investor Behavior",
      "height": 300,
      "data": {
        "labels": ["Average Investor", "S&P 500"],
        "series": [16.54, 25.02]
      },
      "options": {
        "colors": ["#ef4444", "#10b981"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 6
),
updated_at = now()
WHERE id = 6;
EOSQL
```

- [ ] **Step 2: Insert active traders chart after "What NOT to Do"**

After first insert, "What NOT to Do" is at index 5. Insert chart at position 6:

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{6}',
    '{
      "type": "chart",
      "chartType": "bar",
      "heading": "Active Traders vs Market Return",
      "caption": "Source: Barber & Odean, The Journal of Finance (2000)",
      "height": 300,
      "data": {
        "labels": ["Most Active Traders", "Market Return"],
        "series": [11.4, 17.9]
      },
      "options": {
        "colors": ["#ef4444", "#10b981"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 6
),
updated_at = now()
WHERE id = 6;
EOSQL
```

- [ ] **Step 3: Verify**

```bash
docker exec one-day-investor-postgres-1 psql -U postgres -d blog -t -A -c "SELECT content FROM posts WHERE id = 6;" | python3 -c "
import sys, json
data = json.loads(sys.stdin.read().strip())
for i, b in enumerate(data):
    print(f'{i}: [{b[\"type\"]}] {b.get(\"heading\", b.get(\"title\", b.get(\"chartType\", \"\")))}')
"
```

Expected: 11 blocks total, chart blocks at positions 3 and 6.

- [ ] **Step 4: Append SQL and commit**

```bash
git add docs/brainstorm/blog-chart-updates.sql
git commit -m "feat(blog): add charts to post #6 — DALBAR + active traders"
```

---

### Task 8: Add Charts to Post #7 (When One Day Isn't Enough)

**Files:**
- Database update via SQL
- Append to: `docs/brainstorm/blog-chart-updates.sql`

Post #7 block structure:
- Block 0: hero
- Block 1: prose (intro)
- Block 2: markdown "The Rule Still Stands" — DALBAR data
- Block 3: markdown "Exception 1: Job Change"
- Block 4: markdown "Exception 2: Market Drops" — corrections data
- Block 5: markdown "Exception 3: Tax-Loss Harvesting" — tax alpha data
- Block 6: markdown "Exception 4: Open Enrollment" — health insurance data

Insert 4 charts. Because each insert shifts indices, insert from bottom to top.

- [ ] **Step 1: Insert health insurance chart after block 6**

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{7}',
    '{
      "type": "chart",
      "chartType": "bar",
      "heading": "Health Insurance Cost Increase (2026)",
      "caption": "Source: Mercer, Business Group on Health",
      "height": 300,
      "data": {
        "labels": ["Employee Premium Increase", "Total Employer Cost Increase"],
        "series": [7, 9]
      },
      "options": {
        "colors": ["#3b82f6", "#1e40af"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;
EOSQL
```

- [ ] **Step 2: Insert tax alpha chart after "Exception 3" (now index 5, insert at 6)**

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{6}',
    '{
      "type": "chart",
      "chartType": "horizontal-bar",
      "heading": "Tax Alpha by Period (MIT Study)",
      "caption": "Source: Chaudhuri, Burnham & Lo, Financial Analysts Journal (2020)",
      "height": 280,
      "data": {
        "labels": ["1926–1949", "1949–1972", "1972–1995", "1995–2018"],
        "series": [2.29, 0.57, 1.04, 0.83]
      },
      "options": {
        "colors": ["hsl(160,84%,25%)", "hsl(160,70%,40%)", "hsl(150,60%,55%)", "hsl(170,55%,55%)"],
        "suffix": "% annual"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;
EOSQL
```

- [ ] **Step 3: Insert corrections donut after "Exception 2" (now index 4, insert at 5)**

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{5}',
    '{
      "type": "chart",
      "chartType": "donut",
      "heading": "S&P 500 Corrections Since 1974",
      "caption": "Source: Charles Schwab. Only 6 of 27 corrections became bear markets.",
      "height": 320,
      "data": {
        "labels": ["Recovered Without Bear Market", "Became Bear Markets"],
        "series": [21, 6]
      },
      "options": {
        "colors": ["#10b981", "#ef4444"]
      }
    }'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;
EOSQL
```

- [ ] **Step 4: Insert DALBAR bar after "The Rule Still Stands" (index 2, insert at 3)**

```bash
docker exec -i one-day-investor-postgres-1 psql -U postgres -d blog <<'EOSQL'
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{
      "type": "chart",
      "chartType": "bar",
      "heading": "The Behavior Gap (2024)",
      "caption": "Source: DALBAR Quantitative Analysis of Investor Behavior",
      "height": 300,
      "data": {
        "labels": ["Average Investor", "S&P 500"],
        "series": [16.54, 25.02]
      },
      "options": {
        "colors": ["#ef4444", "#10b981"],
        "suffix": "%"
      }
    }'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;
EOSQL
```

- [ ] **Step 5: Verify all 4 charts are in correct positions**

```bash
docker exec one-day-investor-postgres-1 psql -U postgres -d blog -t -A -c "SELECT content FROM posts WHERE id = 7;" | python3 -c "
import sys, json
data = json.loads(sys.stdin.read().strip())
for i, b in enumerate(data):
    print(f'{i}: [{b[\"type\"]}] {b.get(\"heading\", b.get(\"title\", b.get(\"chartType\", \"\")))}')
"
```

Expected: 16 blocks total. Charts at positions 3, 5 (after Exception 2), 7 (after Exception 3), 9 (after Exception 4).

- [ ] **Step 6: Append SQL and commit**

```bash
git add docs/brainstorm/blog-chart-updates.sql
git commit -m "feat(blog): add 4 charts to post #7 — DALBAR, corrections donut, tax alpha, health costs"
```

---

### Task 9: Visual Verification

- [ ] **Step 1: Start the blog dev server**

```bash
cd /Users/pavel/Projects/one-day-investor && bun run --filter blog dev
```

- [ ] **Step 2: Check each post in the browser**

Open each post and verify charts render:

1. http://localhost:3001/frequent-reduces-returns — 1 bar chart (loss visibility)
2. http://localhost:3001/why-investing-apps-make-you-trade-more — 1 donut (PFOF) + 1 bar (DALBAR)
3. http://localhost:3001/monthly-portfolio-check-15-min-routine — 1 bar (DALBAR) + 1 bar (active traders)
4. http://localhost:3001/when-one-day-isnt-enough-exceptions — 4 charts (bar, donut, h-bar, bar)

For each chart verify:
- Emerald theme (dark bg, green-tinted colors)
- Tooltip shows on hover with correct suffix/prefix
- Responsive on window resize
- Caption displays below chart

- [ ] **Step 3: Check editor**

Open http://localhost:3001/editor and create a test post. Add a Chart block, select "donut" type, enter some labels and series JSON. Save and preview.

- [ ] **Step 4: Check a post without charts loads no ApexCharts JS**

Open browser DevTools Network tab on a post without charts (if any). Confirm no `apexcharts` request is made. If all posts now have charts, temporarily remove chart blocks from one post and verify, then restore.

- [ ] **Step 5: Commit any fixes**

If any visual issues were found and fixed:

```bash
git add -A
git commit -m "fix(blog): chart rendering adjustments from visual review"
```

---

### Task 10: Update brainstorm JSON files

- [ ] **Step 1: Export updated post #7 JSON**

```bash
docker exec one-day-investor-postgres-1 psql -U postgres -d blog -t -A -c "SELECT content FROM posts WHERE id = 7;" | python3 -m json.tool > docs/brainstorm/blog-post-when-one-day-isnt-enough.json
```

- [ ] **Step 2: Regenerate SQL file for post #7**

```bash
cd /Users/pavel/Projects/one-day-investor && python3 -c "
import json

with open('docs/brainstorm/blog-post-when-one-day-isnt-enough.json', 'r') as f:
    content = json.load(f)

json_str = json.dumps(content, ensure_ascii=False)
escaped = json_str.replace(\"'\", \"''\")

sql = f\"\"\"INSERT INTO posts (slug, title, excerpt, tags, content, publish_date)
VALUES (
  'when-one-day-isnt-enough-exceptions',
  'When One Day a Month Isn''''t Enough — The Exceptions Worth Knowing',
  'Your monthly routine handles 90% of your financial life. Here are the 5 moments that deserve extra attention — and how to handle them.',
  '[\"personal finance\", \"investing\", \"behavioral finance\", \"portfolio management\", \"long-term investing\", \"savings\", \"salary\"]'::jsonb,
  '{escaped}'::jsonb,
  '2026-04-18'
);\"\"\"

with open('docs/brainstorm/blog-post-when-one-day-isnt-enough.sql', 'w') as f:
    f.write(sql + '\n')
print('Done')
"
```

- [ ] **Step 3: Commit**

```bash
git add docs/brainstorm/blog-post-when-one-day-isnt-enough.json docs/brainstorm/blog-post-when-one-day-isnt-enough.sql docs/brainstorm/blog-chart-updates.sql
git commit -m "docs(blog): update brainstorm files with chart blocks"
```
