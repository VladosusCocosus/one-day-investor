import Html from "@kitajs/html";
import { marked } from "marked";
import type { Block } from "./db";
import type { User } from "@types";
import { t, type Locale } from "./i18n";
import { Grid2x2, LogIn, Heart } from "lucide-static";
import { XTwitterIcon, LinkedInIcon, InstagramIcon } from "@icons";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(text: string): string {
  // Process inline tokens: links, bold, italic, and passthrough safe HTML tags
  const tokenRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|(<(?:em|strong|span|br\s*\/?)(?:\s[^>]*)?>)|(<\/(?:em|strong|span)>)/g;
  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      // Markdown link [text](url)
      const linkText = escapeHtml(match[1]);
      const href = escapeHtml(match[2]);
      result += `<a href="${href}" class="font-medium text-emerald-300 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-200 hover:decoration-emerald-400/60 transition-colors">${linkText}</a>`;
    } else if (match[3] !== undefined) {
      // **bold**
      result += `<strong class="font-semibold text-emerald-50">${escapeHtml(match[3])}</strong>`;
    } else if (match[4] !== undefined) {
      // *italic*
      result += `<em class="text-emerald-50 not-italic">${escapeHtml(match[4])}</em>`;
    } else if (match[5] !== undefined || match[6] !== undefined) {
      // Safe HTML tag passthrough (em, strong, span, br with attributes)
      result += match[0];
    }

    lastIndex = match.index + match[0].length;
  }

  result += escapeHtml(text.slice(lastIndex));
  return result;
}

export function BlogNav({ user, currentPath, locale = "en" }: { user?: User | null; currentPath?: string; locale?: Locale }) {
  const blogUrl = process.env.BLOG_URL || "https://blog.odinvestor.net";
  const redirectParam = currentPath ? `?redirect_to=${encodeURIComponent(blogUrl + currentPath)}` : "";
  const ctaLabel = user ? t("nav.dashboard", locale) : t("nav.signIn", locale);
  const dashboardUrl = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";
  const ctaHref = user
    ? `${dashboardUrl}/dashboard`
    : `${dashboardUrl}/login${redirectParam}`;

  return (
    <header id="blog-nav" class="sticky top-0 z-50 w-full transition-colors duration-200" style="background: transparent;">
      <div class="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8">
        <a
          href="https://odinvestor.net"
          class="flex items-center gap-2.5 text-emerald-100 hover:text-white transition-colors"
        >
          <span
            class="h-3 w-3 rounded-[3px]"
            style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
          ></span>
          <span class="text-sm font-semibold tracking-[0.18em] uppercase">
            One Day Investor
          </span>
        </a>
        <nav class="flex items-center gap-6">
          <a
            href={locale === "en" ? "/" : `/${locale}`}
            class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            {t("nav.blog", locale)}
          </a>
          <a
            href={locale === "en" ? "https://odinvestor.net/philosophy" : `https://odinvestor.net/${locale}/philosophy`}
            class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            {t("nav.philosophy", locale)}
          </a>
          <a
            href={ctaHref}
            class="inline-flex h-9 items-center justify-center rounded-md bg-emerald-50 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors px-2.5 md:px-4"
            aria-label={ctaLabel}
          >
            <span class="h-4 w-4 md:mr-2 [&>svg]:h-4 [&>svg]:w-4">{(user ? Grid2x2 : LogIn) as "safe"}</span>
            <span class="hidden md:inline">{ctaLabel}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export function BlogFooter({ locale = "en" }: { locale?: Locale } = {}) {
  return (
    <footer class="border-t border-emerald-900/40 px-6 py-10 md:px-8">
      <div class="mx-auto max-w-[1200px]">
        <div class="flex flex-col items-center gap-6 text-center sm:gap-8">
          <div class="flex items-center gap-2.5">
            <span
              class="h-2.5 w-2.5 rounded-[2px]"
              style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
            ></span>
            <span class="text-xs font-semibold tracking-[0.18em] uppercase text-emerald-300">
              One Day Investor
            </span>
          </div>
          <p class="max-w-[420px] text-sm leading-relaxed text-emerald-200/70">
            {t("footer.tagline", locale)}
          </p>
          <div class="flex items-center gap-5">
            <a
              href="https://x.com/razin36986"
              target="_blank"
              rel="noopener noreferrer"
              class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
              aria-label="X (Twitter)"
            >
              {XTwitterIcon as "safe"}
            </a>
            <a
              href="https://www.linkedin.com/in/vladislav-razin-7b3420240/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
              aria-label="LinkedIn"
            >
              {LinkedInIcon as "safe"}
            </a>
            <a
              href="https://www.instagram.com/cocosik86/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
              aria-label="Instagram"
            >
              {InstagramIcon as "safe"}
            </a>
          </div>
          <div class="text-xs text-emerald-300/50">{t("footer.copyright", locale)}</div>
        </div>
      </div>
    </footer>
  );
}

export function HeroBlock({
  label,
  title,
  subtitle,
}: {
  label?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section class="relative overflow-hidden px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28">
      <div class="relative mx-auto max-w-[960px] text-center">
        {label && (
          <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <span
              class="h-2 w-2 rounded-[2px]"
              style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
            ></span>
            {label}
          </p>
        )}
        <h1 class="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-5xl md:text-6xl lg:text-7xl">
          {(title)}
        </h1>
        {subtitle && (
          <p class="mx-auto mt-6 max-w-[560px] text-base text-emerald-200 md:text-lg">
            {renderInlineMarkdown(subtitle)}
          </p>
        )}
      </div>
    </section>
  );
}

export function ProseBlock({
  label,
  heading,
  paragraphs,
}: {
  label?: string;
  heading?: string;
  paragraphs: string[];
}) {
  return (
    <section class="border-t border-emerald-900/40 px-6 py-8 md:px-8 md:py-12">
      <div class="mx-auto max-w-[760px]">
        {label && (
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {label}
          </p>
        )}
        {heading && (
          <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            {heading}
          </h2>
        )}
        <div class="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
          {paragraphs.map((p) => (
            <p>{renderInlineMarkdown(p)}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PullQuoteBlock({ text }: { text: string }) {
  return (
    <figure class="my-14 md:my-20">
      <blockquote class="mx-auto max-w-[760px] text-center">
        <p class="text-2xl font-semibold italic leading-snug tracking-tight text-emerald-100 sm:text-3xl md:text-4xl">
          {renderInlineMarkdown(text)}
        </p>
      </blockquote>
    </figure>
  );
}

export function ComparisonBlock({
  label,
  heading,
  intro,
  left,
  right,
  outro,
}: {
  label?: string;
  heading?: string;
  intro?: string;
  left: { label: string; items: string[] };
  right: { label: string; items: string[] };
  outro?: string;
}) {
  return (
    <section class="border-t border-emerald-900/40 px-6 py-8 md:px-8 md:py-12">
      <div class="mx-auto max-w-[1100px]">
        {(label || heading || intro) && (
          <div class="mx-auto max-w-[760px]">
            {label && (
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                {label}
              </p>
            )}
            {heading && (
              <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
                {heading}
              </h2>
            )}
            {intro && (
              <p class="mt-10 text-lg leading-relaxed text-emerald-100/90">
                {renderInlineMarkdown(intro)}
              </p>
            )}
          </div>
        )}
        <div class="mt-14 overflow-hidden rounded-2xl border border-emerald-900/50 bg-emerald-950/40 backdrop-blur-sm">
          <div class="grid grid-cols-1 md:grid-cols-2">
            <div class="p-8 md:border-r md:border-emerald-900/50 md:p-10">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                {left.label}
              </p>
              <ul class="mt-5 space-y-3 text-base text-emerald-200/90">
                {left.items.map((item) => (
                  <li class="flex gap-3">
                    <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60"></span>
                    <span>{renderInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div class="border-t border-emerald-900/50 p-8 md:border-t-0 md:p-10">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                {right.label}
              </p>
              <ul class="mt-5 space-y-3 text-base text-emerald-100">
                {right.items.map((item) => (
                  <li class="flex gap-3">
                    <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
                    <span>{renderInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {outro && (
          <p class="mx-auto mt-10 max-w-[760px] text-lg leading-relaxed text-emerald-100/90">
            {renderInlineMarkdown(outro)}
          </p>
        )}
      </div>
    </section>
  );
}

export function ClosingBlock({
  text,
  author,
}: {
  text: string;
  author: string;
}) {
  return (
    <section class="px-6 py-8 md:px-8 md:py-12">
      <div
        class="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-8"
        style="background: radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%)"
      >
        {text && (
          <p class="text-lg text-emerald-100/90 md:text-xl mb-6">
            {renderInlineMarkdown(text)}
          </p>
        )}
        <p class="text-xl italic text-emerald-100 md:text-2xl">
          — {author}
        </p>
      </div>
    </section>
  );
}

export function ImageBlock({
  src,
  alt,
  caption,
}: {
  src: string;
  alt?: string;
  caption?: string;
}) {
  return (
    <figure class="border-t border-emerald-900/40 px-6 py-16 md:px-8 md:py-8">
      <div class="mx-auto max-w-[960px]">
        <img
          src={src}
          alt={alt ?? ""}
          class="w-full rounded-2xl border border-emerald-900/50"
        />
        {caption && (
          <figcaption class="mt-4 text-center text-sm text-emerald-300/80">
            {caption}
          </figcaption>
        )}
      </div>
    </figure>
  );
}

export function MarkdownBlock({
  label,
  heading,
  body,
}: {
  label?: string;
  heading?: string;
  body: string;
}) {
  const html = marked.parse(body, { async: false }) as string;

  console.log(html)

  return (
    <section class="border-t border-emerald-900/40 px-6 py-8 md:px-8 md:py-12">
      <div class="mx-auto max-w-[760px]">
        {label && (
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {label}
          </p>
        )}
        {heading && (
          <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            {heading}
          </h2>
        )}
        <div
          class="mt-10 prose prose-invert prose-emerald max-w-none text-lg leading-relaxed text-emerald-100/90 [&_h1]:text-3xl [&_h1]:font-bold [&_p]:my-4 [&_h1]:tracking-tight [&_h1]:text-emerald-50 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-emerald-50 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&h3]:mb-4 [&_h3]:text-emerald-50 [&_p]:mb-6 [&_a]:font-medium [&_a]:text-emerald-300 [&_a]:underline [&_a]:decoration-emerald-500/40 [&_a]:underline-offset-2 hover:[&_a]:text-emerald-200 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_li]:text-emerald-200/90 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500/40 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-emerald-200 [&_code]:rounded [&_code]:bg-emerald-900/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-emerald-200 [&_pre]:rounded-xl [&_pre]:bg-emerald-950/60 [&_pre]:border [&_pre]:border-emerald-900/50 [&_pre]:p-6 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:border-emerald-900/40 [&_strong]:text-emerald-50 [&_strong]:font-semibold"
        >
          {html}
        </div>
      </div>
    </section>
  );
}

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

  return (
    <section class="box-border border-t border-emerald-900/40 px-6 py-8 md:px-8 md:py-12">
      <div class="mx-auto max-w-[720px]">
        {heading && (
          <h2 class="text-xl font-semibold tracking-tight text-emerald-50">
            {heading}
          </h2>
        )}
        <div
          class="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-4 my-12 md:m-12"
          data-chart={chartConfig}
        ></div>
        {caption && (
          <p class="mt-3 text-center text-sm text-emerald-300/80">{caption}</p>
        )}
      </div>
    </section>
  );
}

export function renderBlock(block: Block) {
  switch (block.type) {
    case "hero":
      return (
        <HeroBlock
          label={block.label}
          title={block.title}
          subtitle={block.subtitle}
        />
      );
    case "prose":
      return (
        <ProseBlock
          label={block.label}
          heading={block.heading}
          paragraphs={block.paragraphs}
        />
      );
    case "pull-quote":
      return <PullQuoteBlock text={block.text} />;
    case "comparison":
      return (
        <ComparisonBlock
          label={block.label}
          heading={block.heading}
          intro={block.intro}
          left={block.left}
          right={block.right}
          outro={block.outro}
        />
      );
    case "closing":
      return <ClosingBlock text={block.text} author={block.author} />;
    case "image":
      return (
        <ImageBlock src={block.src} alt={block.alt} caption={block.caption} />
      );
    case "markdown":
      return (
        <MarkdownBlock
          label={block.label}
          heading={block.heading}
          body={block.body}
        />
      );
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
    default:
      return "";
  }
}

export function TagPill({
  tag,
  active,
  href,
}: {
  tag: string;
  active?: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-500 text-emerald-950"
          : "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/50 hover:text-emerald-200"
      }`}
    >
      {tag}
    </a>
  );
}

export function LikeButton({ slug }: { slug: string }) {
  return (
    <div class="px-6 pt-6 pb-2 md:px-8">
      <div class="mx-auto max-w-[760px] flex items-center gap-3">
        <button
          id="like-btn"
          data-slug={slug}
          class="group flex items-center gap-2 rounded-full border border-emerald-900/50 bg-emerald-950/40 px-4 py-2 text-sm transition-colors hover:border-emerald-700/50 hover:bg-emerald-900/30"
        >
          <span id="like-heart" class="text-emerald-300 transition-colors group-hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]">{Heart as "safe"}</span>
          <span id="like-count" class="text-emerald-200 tabular-nums">...</span>
        </button>
      </div>
    </div>
  );
}

export function SignInModal({ currentPath, locale = "en" }: { currentPath?: string; locale?: Locale }) {
  const blogUrl = process.env.BLOG_URL || "https://blog.odinvestor.net";
  const redirectParam = currentPath ? `?redirect_to=${encodeURIComponent(blogUrl + currentPath)}` : "";
  return (
    <div
      id="signin-modal"
      class="fixed inset-0 z-[100] hidden items-center justify-center"
      style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);"
    >
      <div
        class="mx-4 max-w-[360px] rounded-2xl border border-emerald-500/30 p-8 text-center shadow-2xl"
        style="background: rgba(6, 78, 54, 0.95); backdrop-filter: blur(12px);"
      >
        <div class="text-3xl">&#x2764;&#xFE0F;</div>
        <p class="mt-4 text-lg font-semibold text-emerald-50">
          {t("signin.title", locale)}
        </p>
        <p class="mt-2 text-sm leading-relaxed text-emerald-200/80">
          {t("signin.body", locale)}
        </p>
        <a
          href={`https://odinvestor.net/login${redirectParam}`}
          class="mt-6 inline-flex h-10 items-center rounded-md bg-emerald-50 px-6 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-white"
        >
          {t("signin.button", locale)}
        </a>
        <p
          id="signin-dismiss"
          class="mt-3 cursor-pointer text-sm text-emerald-300 transition-colors hover:text-emerald-200"
        >
          {t("signin.dismiss", locale)}
        </p>
      </div>
    </div>
  );
}
