import { Link } from "react-router";
import { GoogleIcon } from "./GoogleIcon";

function HeroSparkline() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-8 top-0 h-full w-[520px] opacity-40 md:opacity-60"
      viewBox="0 0 520 300"
      fill="none"
    >
      <defs>
        <linearGradient id="hero-spark-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30 L 520 300 L 0 300 Z"
        fill="url(#hero-spark-fill)"
      />
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30"
        stroke="url(#hero-spark-stroke)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LandingHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16"
    >
      <HeroSparkline />
      <div className="relative mx-auto max-w-[960px] text-center">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          One Day Investor
        </p>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-6xl md:text-7xl">
          A calm, visual way
          <br />
          <span className="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
            to watch your wealth grow.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] text-base text-emerald-200 md:text-xl">
          Track every pocket, asset, and trend in one place.
          <br className="hidden sm:block" />
          Free. No spreadsheets.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/30 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </Link>
          <a
            href="#how"
            className="inline-flex h-12 items-center rounded-lg border border-emerald-300/30 px-6 text-base font-semibold text-emerald-100 hover:bg-emerald-900/30 transition-colors"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
