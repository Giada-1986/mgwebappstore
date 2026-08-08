import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function OptionCard({
  label,
  selected,
  multiple,
  onSelect,
}: {
  label: string;
  selected: boolean;
  multiple?: boolean | undefined;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-4 text-left text-[15px] leading-snug transition-all duration-200",
        "hover:border-gold/60 active:scale-[0.99]",
        selected
          ? "border-gold/70 bg-blush-soft text-blush-foreground shadow-calm"
          : "border-border text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center border transition-colors",
          multiple ? "rounded-md" : "rounded-full",
          selected ? "border-gold gold-surface" : "border-border bg-pearl-warm",
        )}
      >
        {selected ? <Check className="size-3.5 text-primary-foreground" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">{label}</span>
    </button>
  );
}
