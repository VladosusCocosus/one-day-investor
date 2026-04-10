import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/hooks/useCatalog";

// Emerald = invest, amber = crypto, slate = common.
// Keep in sync with PocketList row dots.
const TYPE_COLORS: Record<ServiceType, { dotClass: string; label: string }> = {
  invest: { dotClass: "bg-emerald-500", label: "Invest" },
  crypto: { dotClass: "bg-amber-500", label: "Crypto" },
  common: { dotClass: "bg-slate-400", label: "Common" },
};

const TYPE_ORDER: ServiceType[] = ["common", "invest", "crypto"];

interface PocketTypePillProps {
  value: ServiceType;
  onChange: (value: ServiceType) => void;
  className?: string;
}

export function PocketTypePill({ value, onChange, className }: PocketTypePillProps) {
  const [open, setOpen] = useState(false);
  const current = TYPE_COLORS[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 cursor-pointer hover:bg-muted/80 transition-colors",
            open && "bg-primary/10 border-primary/35",
            className
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", current.dotClass)} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
            {current.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-[140px] p-1">
        <div className="flex flex-col">
          {TYPE_ORDER.map((t) => {
            const info = TYPE_COLORS[t];
            const selected = t === value;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                  "hover:bg-muted",
                  selected && "bg-primary/10 text-primary font-semibold"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", info.dotClass)} />
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
