type Step = { title: string; body: string };

const steps: Step[] = [
  {
    title: "Sign in with Google",
    body: "One click. No new password, no email verification dance.",
  },
  {
    title: "Organize into pockets",
    body:
      "Add the brokers, wallets, and accounts you already use. Group them however makes sense to you.",
  },
  {
    title: "Snapshot, then watch it grow",
    body:
      "Record monthly totals. See trends, distribution, and the one chart that matters most — your portfolio over time.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how" className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            How it works
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            Three steps to a portfolio you can actually read.
          </h2>
        </div>
        <ol className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-xl font-bold text-emerald-200 ring-1 ring-inset ring-emerald-300/40">
                {i + 1}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-emerald-50">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-200/90">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
