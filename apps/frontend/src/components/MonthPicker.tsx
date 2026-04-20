import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  months: string[]; // sorted newest-first, ISO-ish date strings
  value: string | undefined;
  onChange: (month: string) => void;
}

function formatMonthLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

function getYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: "UTC",
  });
}

export function MonthPicker({ months, value, onChange }: MonthPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (months.length === 0) return null;

  // Determine top-3 and overflow
  let pills = months.slice(0, 3);
  let overflow = months.slice(3);

  // If selected month lives in overflow, swap it into the 3rd slot
  // so the active state stays visible in the pill row.
  if (value && overflow.includes(value)) {
    const displaced = months[2];
    pills = [months[0], months[1], value];
    // Place the displaced month at the top of overflow (preserve desc order)
    overflow = [displaced, ...overflow.filter((m) => m !== value)];
  }

  // Group overflow by year (still newest-first inside each group)
  const groupedByYear = overflow.reduce<Record<string, string[]>>((acc, m) => {
    const year = getYear(m);
    (acc[year] ||= []).push(m);
    return acc;
  }, {});
  const years = Object.keys(groupedByYear);

  const handleSelect = (month: string) => {
    onChange(month);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {pills.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-foreground hover:bg-muted/70"
            )}
          >
            {formatMonthLong(m)}
          </button>
        );
      })}
      {overflow.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("monthPicker.moreMonths")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70",
                open && "bg-muted/70"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56">
            <div className="flex flex-col gap-3">
              {years.map((year) => (
                <div key={year}>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {year}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groupedByYear[year].map((m) => {
                      const active = m === value;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelect(m)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {formatMonthShort(m)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
