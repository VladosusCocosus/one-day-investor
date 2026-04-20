import Html from "@kitajs/html";

export interface LangSelectOption {
  value: string;
  label: string;
  href: string;
}

export interface LangSelectProps {
  locale: string;
  options: LangSelectOption[];
}

export function LangSelect({ locale, options }: LangSelectProps) {
  return (
    <div class="flex items-center gap-1.5">
      <svg
        class="text-emerald-400"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <select
        class="appearance-none cursor-pointer rounded-md border border-emerald-500/25 bg-transparent py-1 pl-2 pr-6 text-xs font-semibold text-emerald-100 outline-none"
        style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236ee7b7' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 4px center;"
        onchange="window.location.href=this.value"
        aria-label="Language"
      >
        {options.map((opt) => (
          <option
            value={opt.href}
            selected={opt.value === locale}
            style="background: #064e36; color: #d1fae5;"
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
