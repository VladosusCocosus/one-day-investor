export const SITE = {
  name: "One Day Investor",
  shortName: "ODI",
  description: "A calm, visual way to watch your wealth grow.",
  url: "https://odinvestor.net",
  ogImage: "/og-image.png",
  ogImageAlt:
    "One Day Investor — A calm, visual way to watch your wealth grow.",
  themeColor: "#0f6d4f",
  locale: "en_US",
  twitter: "@onedayinvestor",
} as const;

type Meta = { title: string; description: string };

export const pageMeta: Record<
  | "login"
  | "dashboard"
  | "profile"
  | "assets"
  | "snapshots"
  | "analytics"
  | "philosophy",
  Meta
> = {
  login: {
    title: "Sign in",
    description:
      "Sign in to One Day Investor and keep watching your wealth grow.",
  },
  dashboard: {
    title: "Dashboard",
    description:
      "Your portfolio at a glance — totals, trends, and pockets in one calm view.",
  },
  profile: {
    title: "Profile",
    description: "Shape your pockets and the structure of your portfolio.",
  },
  assets: {
    title: "Assets",
    description: "Every asset across every pocket, in one place.",
  },
  snapshots: {
    title: "Snapshots",
    description: "Capture and revisit portfolio snapshots over time.",
  },
  analytics: {
    title: "Analytics",
    description:
      "Distribution, timelines, and performance for your portfolio.",
  },
  philosophy: {
    title: "Philosophy",
    description:
      "A letter from the person building One Day Investor: invest one day a month, ignore the other thirty.",
  },
};
