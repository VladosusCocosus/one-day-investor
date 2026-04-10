import { useEffect } from "react";
import { SITE } from "./metadata";

type PageMeta = { title: string; description: string };

export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    const fullTitle = `${title} · ${SITE.name}`;
    const prevTitle = document.title;
    document.title = fullTitle;

    const updates: Array<[string, string]> = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', fullTitle],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', fullTitle],
      ['meta[name="twitter:description"]', description],
    ];
    const prev: Array<[Element, string | null]> = [];
    for (const [selector, value] of updates) {
      const el = document.head.querySelector(selector);
      if (el) {
        prev.push([el, el.getAttribute("content")]);
        el.setAttribute("content", value);
      }
    }

    return () => {
      document.title = prevTitle;
      for (const [el, value] of prev) {
        if (value === null) el.removeAttribute("content");
        else el.setAttribute("content", value);
      }
    };
  }, [title, description]);
}
