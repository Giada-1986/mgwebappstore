/**
 * Firma discreta del brand: monogramma MG in un sottile cerchio dorato.
 * Puramente decorativo, riutilizzabile nelle altre app del bundle.
 */
export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-full border border-gold/60 bg-pearl-warm/80 shadow-[0_1px_6px_-3px_oklch(0.5_0.05_60/35%)] ${className}`}
    >
      <span className="font-display text-[10px] font-semibold tracking-[0.08em] text-gold-deep">
        MG
      </span>
    </span>
  );
}
