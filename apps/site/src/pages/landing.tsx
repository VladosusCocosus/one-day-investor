import Html from "@kitajs/html";
import { t, localePath, type Locale } from "../i18n";
import { Layout } from "../layout";
import { Hero } from "../components/hero";
import { DashboardPreview } from "../components/dashboard-preview";
import { Features } from "../components/features";
import { Exchanges } from "../components/exchanges";
import { AgentsSection } from "../components/agents-section";
import { PhilosophyCard } from "../components/philosophy-card";
import { Guide } from "../components/guide";
import { BlogPreview } from "../components/blog-preview";
import { FinalCta } from "../components/final-cta";

const SITE_URL = process.env.SITE_URL || "https://odinvestor.net";

export async function LandingPage({
  locale,
  isLoggedIn,
}: {
  locale: Locale;
  isLoggedIn?: boolean;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "One Day Investor",
    url: `${SITE_URL}${localePath("/", locale)}`,
    description: t("site.description", locale),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const blogHtml = await BlogPreview({ locale });

  return (
    <Layout
      title={t("site.description", locale)}
      description={t("site.description", locale)}
      canonicalPath="/"
      locale={locale}
      jsonLd={jsonLd}
      isLoggedIn={isLoggedIn}
    >
      <Hero locale={locale} />
      <DashboardPreview locale={locale} />
      <Features locale={locale} />
      <Exchanges locale={locale} />
      <AgentsSection locale={locale} />
      <PhilosophyCard locale={locale} />
      <Guide locale={locale} />
      {blogHtml as "safe"}
      <FinalCta locale={locale} />
    </Layout>
  );
}
