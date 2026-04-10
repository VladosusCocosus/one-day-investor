import { Link } from "react-router";
import { GoogleIcon } from "./GoogleIcon";

export function LandingFinalCta() {
  return (
    <section id="cta" className="px-6 py-24 md:px-8 md:py-32">
      <div
        className="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-24"
        style={{
          background:
            "radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%)",
        }}
      >
        <h2 className="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
          Start watching your wealth grow.
        </h2>
        <div className="mt-10 flex justify-center">
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </Link>
        </div>
      </div>
    </section>
  );
}
