export function LandingFooter() {
  return (
    <footer className="border-t border-emerald-900/40 px-6 py-10 md:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 text-xs text-emerald-300 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          <span className="font-semibold tracking-[0.18em] uppercase">One Day Investor</span>
        </div>
        <div className="flex items-center gap-5">
          <span>© 2026 One Day Investor</span>
          <span aria-hidden="true">·</span>
          <a
            href="https://odinvestor.net"
            className="hover:text-emerald-100 transition-colors"
          >
            odinvestor.net
          </a>
        </div>
      </div>
    </footer>
  );
}
