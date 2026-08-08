import { Button } from "@/components/ui/button";
import { dictionaries, languages, useI18n } from "@/apps/fame-o-emozione/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="sr-only">{t.common.language}</span>
      {languages.map((code) => (
        <Button
          key={code}
          type="button"
          size="sm"
          variant={code === lang ? "secondary" : "ghost"}
          onClick={() => setLang(code)}
          aria-label={dictionaries[code].langName}
          aria-pressed={code === lang}
          className={cn("h-8 px-2.5 text-xs uppercase", code === lang && "font-semibold")}
        >
          {code}
        </Button>
      ))}
    </div>
  );
}
