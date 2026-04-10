import type { ReactNode } from "react";

export function PullQuote({ children }: { children: ReactNode }) {
  return (
    <figure className="my-14 md:my-20">
      <blockquote className="mx-auto max-w-[760px] text-center">
        <p className="text-2xl font-semibold italic leading-snug tracking-tight text-emerald-100 sm:text-3xl md:text-4xl">
          {children}
        </p>
      </blockquote>
    </figure>
  );
}
