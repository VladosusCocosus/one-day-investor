# Shared UI Package (`packages/ui`)

Extract duplicated nav, footer, and page shell components from `apps/blog` and `apps/site` into a shared `packages/ui` package.

## Context

Both apps use Elysia + KitaJS/HTML for SSR with identical Tailwind theming. The nav and footer are ~95% identical between apps — same logo gradient, same emerald color scheme, same social links, same CTA pattern. No shared UI package exists today; everything is duplicated in-app.

## Design

### Package structure

```
packages/ui/
  package.json        # name: @ui, peer-depends on @kitajs/html
  index.ts            # re-exports Nav, Footer, PageShell
  nav.tsx
  footer.tsx
  page-shell.tsx
```

### Components

#### `Nav`

Props-based navigation bar. Each app passes translated strings and config.

```ts
interface NavProps {
  locale: string
  logoText: string
  logoHref: string
  backLink?: { href: string; label: string }
  ctaHref: string
  ctaLabel: string
  ctaIconHtml?: string
  isLoggedIn?: boolean
}
```

Renders: logo with gradient, optional back link, CTA button with responsive icon/text behavior (icon-only on mobile, icon+text on desktop).

#### `Footer`

```ts
interface FooterProps {
  logoText: string
  tagline: string
  socialLinks: Array<{ href: string; iconHtml: string; label: string }>
  copyrightText: string
}
```

Renders: logo, tagline, social icon row, copyright line.

#### `PageShell`

Composes Nav + content area + Footer.

```ts
interface PageShellProps {
  nav: NavProps
  footer: FooterProps
  children: Html.Children
}
```

Renders: `<Nav /> <main>{children}</main> <Footer />`

### i18n approach

Shared components have zero knowledge of i18n. Each app calls its own `t()` function and passes translated strings as props. This keeps the package pure and decoupled.

### Changes per app

**Blog (`apps/blog`)**:
- Delete `BlogNav` and `BlogFooter` from `components.tsx`
- Import `PageShell` from `@ui`
- Pass translated strings as props in layout/page rendering

**Site (`apps/site`)**:
- Delete `components/nav.tsx` and `components/footer.tsx`
- Import `PageShell` from `@ui`
- Same prop-passing pattern

### What stays app-specific

- **Blog**: all content blocks (HeroBlock, ProseBlock, ChartBlock, etc.), PostCard, LikeButton, SignInModal, EditorLayout
- **Site**: Hero, Features, Guide, Exchanges, BlogPreview, LangSwitcher, all landing page sections
- **Both**: their own `layout.tsx` (HTML document wrapper, OG tags, scripts), i18n locale files, routing

### Out of scope

- i18n unification (apps keep their own locale files and `t()`)
- Breaking apart blog's monolithic `components.tsx` (separate effort)
- Tailwind config sharing (already consistent)
