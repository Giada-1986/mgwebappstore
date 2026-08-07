import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const options: Lang[] = ["it", "en"];

  return (
    <div
      translate="no"
      className={cn(
        "notranslate inline-flex items-center rounded-full border border-border bg-card/70 p-0.5 backdrop-blur",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          translate="no"
          lang={opt}
          onClick={() => setLang(opt)}
          aria-pressed={lang === opt}
          aria-label={opt === "it" ? "Italiano" : "English"}
          className={cn(
            "notranslate rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            lang === opt
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
