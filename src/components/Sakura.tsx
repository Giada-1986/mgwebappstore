import { cn } from "@/lib/utils";

function Petal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("text-sakura", className)} aria-hidden="true">
      <g fill="currentColor" opacity="0.65">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="50" cy="28" rx="12" ry="20" transform={`rotate(${deg} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="6" fill="var(--gold)" opacity="0.7" />
    </svg>
  );
}

/** Discreet sakura petals for page corners. */
export function SakuraCorners() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Petal className="absolute -left-6 -top-6 h-28 w-28 rotate-12 opacity-40" />
      <Petal className="absolute right-4 top-24 h-10 w-10 -rotate-12 opacity-30" />
      <Petal className="absolute -right-8 bottom-10 h-24 w-24 rotate-45 opacity-35" />
      <Petal className="absolute left-8 bottom-24 h-8 w-8 opacity-25" />
    </div>
  );
}

/** Light sakura divider. */
export function SakuraDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-6", className)} aria-hidden="true">
      <span className="gold-divider w-24" />
      <Petal className="h-4 w-4" />
      <span className="gold-divider w-24" />
    </div>
  );
}
