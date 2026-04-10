import { Link } from "react-router";
import { GoogleIcon } from "@/components/landing/GoogleIcon";

export function PhilosophyClosing() {
  return (
    <section
      id="philosophy-closing"
      aria-labelledby="philosophy-closing-heading"
      className="px-6 py-24 md:px-8 md:py-32"
    >
      <div
        className="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-24"
        style={{
          background:
            "radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%)",
        }}
      >
        <p
          id="philosophy-closing-heading"
          className="text-xl italic text-emerald-100 md:text-2xl"
        >
          — Vlad, building One Day Investor
        </p>
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
