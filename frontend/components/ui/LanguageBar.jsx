import { langMeta } from "@/lib/languages";
import { cn } from "@/lib/format";

/** GitHub-style proportional language bar with an optional legend. */
export function LanguageBar({ languages = [], legend = false, className, max = 4 }) {
  const items = (languages || []).filter((l) => l.share > 0);
  if (!items.length) return null;
  return (
    <div className={className}>
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-ink-800">
        {items.map((l) => (
          <span
            key={l.language}
            title={`${langMeta(l.language).label} ${(l.share * 100).toFixed(1)}%`}
            style={{ width: `${Math.max(l.share * 100, 1.5)}%`, background: langMeta(l.language).color }}
          />
        ))}
      </div>
      {legend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {items.slice(0, max).map((l) => (
            <li key={l.language} className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className="size-2 rounded-full" style={{ background: langMeta(l.language).color }} />
              {langMeta(l.language).label}
              <span className="font-mono text-fg-subtle">{(l.share * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LangDot({ language, className }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: langMeta(language).color }} />;
}
