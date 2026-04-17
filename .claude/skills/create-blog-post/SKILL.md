---
name: create-blog-post
description: Use when user asks to write, create, or draft a blog post for One Day Investor. Triggers on "write a post", "create blog post", "draft article", "new post about".
---

# Create Blog Post

Write research-backed blog posts for One Day Investor in the structured JSON block format, with SQL ready to insert.

## Workflow

1. **Get topic** — confirm title, angle, and target tags with user
2. **Research** — use WebSearch to find studies, data, and sources (3-8 sources minimum)
3. **Write content** — draft the article using the block format below
4. **Review with user** — present the draft, iterate on feedback
5. **Save files** — write both JSON and SQL to `docs/brainstorm/`

## Block Types

```typescript
type Block =
  | { type: "hero"; label?: string; title: string; subtitle?: string }
  | { type: "prose"; label?: string; heading?: string; paragraphs: string[] }
  | { type: "markdown"; label?: string; heading?: string; body: string }
  | { type: "pull-quote"; text: string }
  | { type: "comparison"; label?: string; heading?: string; intro?: string;
      left: { label: string; items: string[] };
      right: { label: string; items: string[] }; outro?: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "closing"; text: string; author: string }
```

## Post Structure Template

Every post follows this pattern:

1. **Hero** — label (e.g. "Research"), title, subtitle summarizing the thesis
2. **Prose (introduction)** — 2-3 paragraphs setting up the problem, label "introduction"
3. **Markdown sections** — main content, each with a heading. Use markdown for:
   - Inline links to research `[Author (Year)](url)`
   - Bold for key stats (`**11.4% annually**`)
   - `###` subheadings within sections
   - `---` dividers between subsections
   - Blockquotes for key takeaways (`> Quote`)
   - Bulleted/numbered lists
4. **Sources section** — markdown block with heading "Sources", bulleted list of all references
5. **Closing** — brief message + author "One Day Investor"

## Content Scope

One Day Investor is **not just about investing**. It covers the full personal finance picture:

- **Salary & income tracking** — how much you earn and how it changes over time
- **Savings rate** — how much you keep matters more than how your investments perform
- **Portfolio tracking** — calm, periodic review of investments
- **Net worth** — the complete picture across all accounts
- **Behavioral finance** — the psychology behind financial decisions
- **Personal finance habits** — budgeting, spending awareness, financial routines

The core philosophy: **your savings rate and salary growth are the primary drivers of wealth**, not investment returns. Investment returns matter, but they compound on top of what you actually save.

## Content Style

- Research-backed with inline citations and links
- Data-driven: include specific numbers, percentages, study sizes
- Tie back to One Day Investor philosophy (calm tracking, one day a month, savings over speculation)
- Conversational but authoritative tone
- End sections with insight, not just facts
- Link to `https://odinvestor.net/philosophy` where relevant

## Output Files

Save to `docs/brainstorm/blog-post-{slug}.json` and `docs/brainstorm/blog-post-{slug}.sql`.

### SQL Format

```sql
INSERT INTO posts (slug, title, excerpt, tags, content, publish_date)
VALUES (
  '{slug}',
  '{title}',
  '{excerpt — 120-160 chars for SEO}',
  '["tag1", "tag2"]'::jsonb,
  '{content JSON with single quotes escaped as two single quotes}'::jsonb,
  '{YYYY-MM-DD}'
);
```

**Critical:** Escape all single quotes in the JSON content as `''` for PostgreSQL.

## Social Media Companion

Also create files with content for:
- **X post** — hook + key stat + link + hashtags (under 280 chars)
- **LinkedIn post** — 3-5 paragraph professional format with link

## Common Tags

`behavioral finance`, `investing`, `research`, `fintech`, `portfolio management`, `psychology`, `long-term investing`, `personal finance`, `savings`, `salary`, `net worth`, `budgeting`
