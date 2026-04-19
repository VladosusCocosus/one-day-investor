const SUPPORTED = ["en", "ru", "uk", "es", "de", "fr", "pt", "it", "pl", "nl"] as const;
const DEFAULT_LANGUAGE = "en";

type SupportedLanguage = (typeof SUPPORTED)[number];

export function parseAcceptLanguage(header: string | null | undefined): SupportedLanguage {
  if (!header) return DEFAULT_LANGUAGE;

  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag && c.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const base = tag.split("-")[0];
    if ((SUPPORTED as readonly string[]).includes(base)) {
      return base as SupportedLanguage;
    }
  }

  return DEFAULT_LANGUAGE;
}
