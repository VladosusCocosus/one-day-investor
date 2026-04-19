import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const BLOG_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publish_date: string | null;
};

export async function BlogPreview({ locale }: { locale: Locale }) {
  let posts: BlogPost[] = [];
  try {
    const res = await fetch(`${BLOG_URL}/api/latest`);
    if (res.ok) posts = await res.json();
  } catch {
    // blog may be unavailable
  }

  if (posts.length === 0) return "";

  const dateLocale = locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US";

  return (
    <section class="px-6 py-24 md:px-8 md:py-32 border-t border-emerald-900/40">
      <div class="mx-auto max-w-[1200px]">
        <div class="mx-auto max-w-[720px] text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("blog.label", locale)}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            {t("blog.title", locale)}
          </h2>
        </div>
        <div class="mt-16 flex flex-col items-center gap-5 md:flex-row md:justify-center">
          {posts.map((post) => (
            <a
              href={`${BLOG_URL}/${post.slug}`}
              class="group w-full max-w-sm rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60 md:w-1/3"
            >
              {post.publish_date && (
                <p class="text-xs font-medium text-emerald-400/80">
                  {new Date(post.publish_date).toLocaleDateString(dateLocale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              <h3 class="mt-3 text-xl font-semibold text-emerald-50 group-hover:text-white transition-colors">
                {post.title}
              </h3>
              {post.excerpt && (
                <p class="mt-3 text-sm leading-relaxed text-emerald-200/80 line-clamp-3">
                  {post.excerpt}
                </p>
              )}
              {post.tags.length > 0 && (
                <div class="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span class="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
        <div class="mt-10 text-center">
          <a
            href={BLOG_URL}
            class="inline-flex h-11 items-center rounded-lg border border-emerald-300/40 bg-emerald-900/20 px-6 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-colors"
          >
            {t("blog.viewAll", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
