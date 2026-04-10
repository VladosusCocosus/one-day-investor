import { Layers, Wallet, Camera, BarChart3, type LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const features: Feature[] = [
  {
    icon: Layers,
    title: "Pockets",
    body:
      "Group holdings however you actually think about them — by broker, by strategy, by goal. Nest pockets as deep as you need.",
  },
  {
    icon: Wallet,
    title: "Assets",
    body:
      "Track every crypto and investment holding across every pocket in one searchable table. Live prices included.",
  },
  {
    icon: Camera,
    title: "Snapshots",
    body:
      "Capture your whole portfolio on a schedule you pick. Every snapshot is a dated record you can revisit and compare.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body:
      "Distribution donut, timeline chart, largest holdings — the whole picture, always one click away.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Features
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            Built for how real portfolios actually work.
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-emerald-50">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-200/90">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
