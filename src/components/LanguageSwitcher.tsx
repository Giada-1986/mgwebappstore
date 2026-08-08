import { Globe, Check } from "lucide-react";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Discreet globe icon opening the language menu (language, never country). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("store.language.label")}
          title={t("store.language.label")}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          )}
        >
          <Globe size={18} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLang(l.code as Lang)}
            translate="no"
            lang={l.code}
            className="notranslate flex items-center justify-between gap-3"
          >
            <span translate="no" className="notranslate">
              {l.label}
            </span>
            {lang === l.code && <Check size={14} aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
