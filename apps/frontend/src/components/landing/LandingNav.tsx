import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaLabel = user ? "Go to dashboard" : "Sign in";
  const ctaHref = user ? "/dashboard" : "/login";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full motion-safe:transition-colors",
        scrolled
          ? "bg-[#02281c]/95 backdrop-blur-md border-b border-emerald-900/40"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-emerald-100 hover:text-white transition-colors">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[3px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">
            One Day Investor
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            Features
          </a>
          {loading ? (
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-[84px] items-center rounded-md bg-emerald-50/20"
            />
          ) : (
            <Link
              to={ctaHref}
              className="inline-flex h-9 items-center rounded-md bg-emerald-50 px-4 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors"
            >
              {ctaLabel}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
