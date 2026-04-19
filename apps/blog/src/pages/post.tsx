import Html from "@kitajs/html";
import type { BlogPost } from "../db";
import type { User } from "@types";
import { renderBlock, TagPill, LikeButton, SignInModal } from "../components";
import { Layout } from "../layout";
import { t, type Locale } from "../i18n";

export function PostPage({ post, user, locale = "en" }: { post: BlogPost; user?: User | null; locale?: Locale }) {
  const dateLocales: Record<Locale, string> = { en: "en-US", ru: "ru-RU", es: "es-ES" };
  const date = post.publish_date
    ? new Date(post.publish_date).toLocaleDateString(dateLocales[locale], {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : t("blog.draft", locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publish_date || undefined,
    dateModified: post.updated_at || undefined,
    inLanguage: locale,
    author: {
      "@type": "Organization",
      name: "One Day Investor",
      url: "https://odinvestor.net",
    },
    publisher: {
      "@type": "Organization",
      name: "One Day Investor",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${process.env.BLOG_URL || "https://blog.odinvestor.net"}/${post.slug}`,
    },
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
  };

  const hasCharts = post.content.some((block) => block.type === "chart");

  return (
    <Layout
      title={post.title}
      description={post.excerpt}
      ogImage={post.og_image}
      canonicalPath={`/${post.slug}`}
      publishDate={post.publish_date}
      modifiedDate={post.updated_at}
      ogType="article"
      jsonLd={jsonLd}
      user={user}
      locale={locale}
    >
      {/* Post metadata */}
      <div class="px-6 pt-8 md:px-8">
        <div class="mx-auto max-w-[1200px]">
          <a
            href="/"
            class="inline-flex items-center gap-1.5 text-sm text-emerald-300 hover:text-emerald-200 transition-colors"
          >
            {t("post.allPosts", locale)}
          </a>
          <p class="mt-4 text-xs font-medium text-emerald-400/80">{date}</p>
          {post.tags.length > 0 && (
            <div class="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagPill
                  tag={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render content blocks */}
      {post.content.map((block) => renderBlock(block))}

      {/* Like button below content */}
      <LikeButton slug={post.slug} />

      {/* Sign-in modal (hidden by default) */}
      <SignInModal currentPath={`/${post.slug}`} locale={locale} />

      {/* Client-side like interactivity */}
      <script>
        {`
          (function() {
            var slug = "${post.slug}";
            var isLoggedIn = ${user ? "true" : "false"};
            var btn = document.getElementById("like-btn");
            var heart = document.getElementById("like-heart");
            var countEl = document.getElementById("like-count");
            var modal = document.getElementById("signin-modal");
            var dismiss = document.getElementById("signin-dismiss");
            var liked = false;
            var count = 0;

            function updateUI() {
              countEl.textContent = count;
              if (liked) {
                heart.setAttribute("fill", "currentColor");
                heart.classList.remove("text-emerald-300");
                heart.classList.add("text-emerald-400");
              } else {
                heart.setAttribute("fill", "none");
                heart.classList.remove("text-emerald-400");
                heart.classList.add("text-emerald-300");
              }
            }

            function showModal() {
              modal.style.display = "flex";
            }

            function hideModal() {
              modal.style.display = "none";
            }

            // Fetch initial state
            fetch("/api/posts/" + slug + "/likes", { credentials: "include" })
              .then(function(r) { return r.json(); })
              .then(function(data) {
                count = data.count;
                liked = data.liked;
                updateUI();
              });

            btn.addEventListener("click", function() {
              if (!isLoggedIn) {
                showModal();
                return;
              }
              // Optimistic update
              liked = !liked;
              count += liked ? 1 : -1;
              updateUI();

              fetch("/api/posts/" + slug + "/like", {
                method: liked ? "POST" : "DELETE",
                credentials: "include",
              })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  count = data.count;
                  liked = data.liked;
                  updateUI();
                })
                .catch(function() {
                  // Revert on error
                  liked = !liked;
                  count += liked ? 1 : -1;
                  updateUI();
                });
            });

            // Modal dismissal
            dismiss.addEventListener("click", hideModal);
            modal.addEventListener("click", function(e) {
              if (e.target === modal) hideModal();
            });
            document.addEventListener("keydown", function(e) {
              if (e.key === "Escape") hideModal();
            });
          })();
        `}
      </script>
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
                          fontSize: "14px",
                          fontWeight: 600,
                        },
                      },
                    },
                  },
                };
                apexOpts.stroke = { width: 5, colors: ["rgba(2,40,28,1)"] };
                apexOpts.legend.show = false;
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
    </Layout>
  );
}

export function NotFoundPage({ user, locale = "en" }: { user?: User | null; locale?: Locale }) {
  return (
    <Layout title={t("post.notFound", locale)} user={user} locale={locale}>
      <section class="px-6 py-32 text-center md:px-8">
        <h1 class="text-4xl font-bold text-emerald-50">{t("post.notFound", locale)}</h1>
        <p class="mt-4 text-lg text-emerald-200/80">
          {t("post.notFoundBody", locale)}
        </p>
        <a
          href="/"
          class="mt-8 inline-flex h-10 items-center rounded-md bg-emerald-50 px-5 text-sm font-semibold text-emerald-950 hover:bg-white transition-colors"
        >
          {t("post.backToBlog", locale)}
        </a>
      </section>
    </Layout>
  );
}
