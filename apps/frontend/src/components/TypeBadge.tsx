import type { ServiceType } from "@/hooks/useCatalog";

const colors: Record<ServiceType, string> = {
  common: "bg-gray-100 text-gray-600",
  invest: "bg-blue-100 text-blue-700",
  crypto: "bg-orange-100 text-orange-700",
};

export function TypeBadge({ type }: { type: ServiceType }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[type]}`}>
      {type}
    </span>
  );
}
