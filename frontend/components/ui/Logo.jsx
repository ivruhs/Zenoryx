import { cn } from "@/lib/format";

/** A pink sticker printed slightly off-register over a blue plate, with a Z cut-line. */
export function LogoMark({ className = "size-8" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="5" width="28" height="28" rx="9" fill="var(--color-blue)" />
      <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--color-pink)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M10 10.5h12L10 21.5h12" stroke="var(--color-ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 25.5h15" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.6" />
    </svg>
  );
}

export function Logo({ className, compact = false }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-[1.35rem] font-extrabold tracking-[-0.045em]" style={{ fontVariationSettings: '"wdth" 88' }}>
          zenoryx
        </span>
      )}
    </span>
  );
}
