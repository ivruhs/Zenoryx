// Hand-drawn bits shared by the public pages: scissors, arrows, scribbles, torn edges.
import { cn } from "@/lib/format";

/** Scissors whose upper blade snips open and shut (keyframes `snip`). */
export function SnippingScissors({ className, snipping = true }) {
  return (
    <svg viewBox="0 0 52 34" className={cn("overflow-visible", className)} aria-hidden="true">
      {/* lower blade + handle (static) */}
      <g>
        <path d="M22 17 L50 25" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="9" cy="25" r="6.5" fill="var(--color-pink)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <path d="M14.5 22.5 L22 17" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* upper blade + handle (snips around the pivot) */}
      <g
        style={{
          transformOrigin: "22px 17px",
          animation: snipping ? "snip 0.55s ease-in-out infinite" : undefined,
        }}
      >
        <path d="M22 17 L50 9" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="9" cy="9" r="6.5" fill="var(--color-yellow)" stroke="var(--color-ink)" strokeWidth="2.4" />
        <path d="M14.5 11.5 L22 17" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="22" cy="17" r="2.2" fill="var(--color-paper-2)" stroke="var(--color-ink)" strokeWidth="1.6" />
    </svg>
  );
}

/** A loose hand-drawn arrow. `variant` picks the stroke shape. */
export function HandArrow({ className, variant = "curl", color = "var(--color-ink)" }) {
  const paths = {
    curl: { d: "M6 8 C 40 2, 70 18, 62 44 C 58 56, 46 60, 38 56", head: "M44 49 L37 56 L46 60" },
    down: { d: "M10 4 C 22 20, 8 34, 26 52", head: "M17 47 L26 53 L28 42" },
    left: { d: "M88 14 C 64 4, 34 30, 8 22", head: "M17 15 L7 22 L17 29" },
    right: { d: "M4 20 C 30 6, 58 34, 86 18", head: "M77 12 L87 18 L78 26" },
  };
  const p = paths[variant] || paths.curl;
  return (
    <svg viewBox="0 0 96 64" fill="none" className={cn("overflow-visible", className)} aria-hidden="true">
      <path d={p.d} stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d={p.head} stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Wobbly underline scribble. */
export function Scribble({ className, color = "var(--color-pink)" }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" fill="none" className={className} aria-hidden="true">
      <path d="M3 9 C 40 3, 70 12, 104 7 S 170 4, 197 8" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Zig-zag torn paper edge (place at top/bottom of a sheet). */
export function TornEdge({ className, fill = "var(--color-paper-2)", flip = false }) {
  // Irregular teeth so it reads as torn, not machine-cut.
  const jitter = [1, 6, 2, 8, 3, 7, 1, 5, 2, 9, 4, 6, 1, 8, 3, 5];
  const teeth = Array.from({ length: 41 }, (_, i) => `${i * 10},${i % 2 ? 9 + (jitter[i % 16] % 3) : jitter[i % 16] % 4}`).join(" ");
  return (
    <svg
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className={cn("block h-3 w-full", flip && "rotate-180", className)}
      aria-hidden="true"
    >
      <polygon points={`0,12 ${teeth} 400,12`} fill={fill} />
    </svg>
  );
}
