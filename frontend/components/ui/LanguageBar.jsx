import { langMeta } from "@/lib/languages";
import { cn } from "@/lib/format";

/** Proportional language bar printed as a striped ribbon with an optional legend. */
export function LanguageBar({ languages = [], legend = false, className, max = 4 }) {
  const items = (languages || []).filter((l) => l.share > 0);
  if (!items.length) return null;
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full border-[1.5px] border-ink bg-paper-2">
        {items.map((l, i) => (
          <span
            key={l.language}
            title={`${langMeta(l.language).label} ${(l.share * 100).toFixed(1)}%`}
            className={cn(i > 0 && "border-l-[1.5px] border-ink")}
            style={{ width: `${Math.max(l.share * 100, 2)}%`, background: langMeta(l.language).color }}
          />
        ))}
      </div>
      {legend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {items.slice(0, max).map((l) => (
            <li key={l.language} className="flex items-center gap-1.5 text-sm text-ink-2">
              <LangDot language={l.language} />
              {langMeta(l.language).label}
              <span className="font-mono text-xs text-ink-3">{(l.share * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LangDot({ language, className }) {
  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full border border-ink/70", className)}
      style={{ background: langMeta(language).color }}
    />
  );
}
