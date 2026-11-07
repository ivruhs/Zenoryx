import { STAGES } from "@/lib/pipeline";
import { cn } from "@/lib/format";

/* Tiny spot-colour illustrations, one per stage. */
function FetchArt() {
  return (
    <svg viewBox="0 0 120 70" className="h-full w-full" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${14 + i * 8} ${10 + i * 7}) rotate(${-6 + i * 5})`}>
          <rect width="58" height="40" rx="5" fill={["var(--color-paper-2)", "var(--color-yellow)", "var(--color-paper-2)"][i]} stroke="var(--color-ink)" strokeWidth="1.8" />
          <path d="M8 11h26M8 19h38M8 27h20" stroke="var(--color-ink)" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {[38, 26, 14].map((h, i) => (
        <rect key={i} x={88 + i * 9} y={60 - h} width="6" height={h} rx="2" fill="var(--color-pink)" stroke="var(--color-ink)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
function CutArt() {
  return (
    <svg viewBox="0 0 120 70" className="h-full w-full" aria-hidden="true">
      <rect x="10" y="6" width="78" height="24" rx="5" fill="var(--color-blue-soft)" stroke="var(--color-ink)" strokeWidth="1.8" transform="rotate(-4 49 18)" />
      <rect x="22" y="40" width="78" height="24" rx="5" fill="var(--color-pink-soft)" stroke="var(--color-ink)" strokeWidth="1.8" transform="rotate(3 61 52)" />
      <path d="M4 35h112" stroke="var(--color-ink)" strokeWidth="2" strokeDasharray="5 4" />
      <g transform="translate(84 24)">
        <circle cx="6" cy="6" r="5" fill="var(--color-yellow)" stroke="var(--color-ink)" strokeWidth="1.8" />
        <circle cx="6" cy="18" r="5" fill="var(--color-pink)" stroke="var(--color-ink)" strokeWidth="1.8" />
        <path d="M10 9 L30 13 M10 15 L30 9" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
function AnnotateArt() {
  return (
    <svg viewBox="0 0 120 70" className="h-full w-full" aria-hidden="true">
      <rect x="16" y="6" width="88" height="58" rx="5" fill="var(--color-paper-2)" stroke="var(--color-ink)" strokeWidth="1.8" />
      <path d="M30 6v58" stroke="var(--color-pink)" strokeWidth="1.6" />
      {[18, 28, 38, 48].map((y) => (
        <path key={y} d={`M24 ${y}h74`} stroke="var(--color-blue)" strokeOpacity=".22" strokeWidth="1.4" />
      ))}
      <path d="M36 17c8-4 14 3 22-1s14 2 22-1M36 27c10-3 18 3 30 0M36 37c6-3 12 2 18 0" stroke="var(--color-ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M58 44h34" stroke="var(--color-yellow)" strokeWidth="7" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}
function EmbedArt() {
  return (
    <svg viewBox="0 0 120 70" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 13 }, (_, c) => {
          const v = Math.abs(Math.sin(r * 1.7 + c * 0.9));
          return <circle key={`${r}-${c}`} cx={10 + c * 8.3} cy={10 + r * 10} r={1 + v * 2.8} fill={v > 0.75 ? "var(--color-pink)" : "var(--color-blue)"} />;
        }),
      )}
    </svg>
  );
}
function HistoryArt() {
  return (
    <svg viewBox="0 0 120 70" className="h-full w-full" aria-hidden="true">
      <path d="M14 35h92" stroke="var(--color-ink)" strokeWidth="2" />
      {[14, 44, 74, 104].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="35" r="7" fill={i === 3 ? "var(--color-green)" : "var(--color-paper-2)"} stroke="var(--color-ink)" strokeWidth="2" />
          <rect x={x - 12} y={i % 2 ? 46 : 8} width="24" height="12" rx="3" fill={i % 2 ? "var(--color-green-soft)" : "var(--color-orange-soft)"} stroke="var(--color-ink)" strokeWidth="1.4" />
        </g>
      ))}
    </svg>
  );
}

const ART = [FetchArt, CutArt, AnnotateArt, EmbedArt, HistoryArt];
const TINTS = ["bg-yellow-soft", "bg-pink-soft", "bg-blue-soft", "bg-paper-2", "bg-green-soft"];
const TILTS = [-1.2, 0.8, -0.6, 1.1, -0.9];

export function PipelineTrack() {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
      {STAGES.map((stage, i) => {
        const Art = ART[i];
        return (
          <li
            key={stage.id}
            className="group relative transition-transform duration-300 hover:!rotate-0 hover:-translate-y-1"
            style={{ transform: `rotate(${TILTS[i]}deg)` }}
          >
            <div className="paper flex h-full flex-col overflow-hidden">
              <div className={cn("relative h-28 border-b-[1.5px] border-ink p-3", TINTS[i])}>
                <Art />
                <span className="absolute left-3 top-2 font-display text-3xl font-extrabold tracking-tighter text-ink" style={{ fontVariationSettings: '"wdth" 75' }}>
                  0{i + 1}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-xl font-extrabold tracking-tight">{stage.label}</h3>
                <p className="mt-1 text-[14px] leading-snug text-ink-2">{stage.verb}.</p>
                <p className="mt-auto pt-4 font-mono text-[10.5px] uppercase tracking-wide text-ink-3">{stage.hint}</p>
              </div>
            </div>
            <span
              className="hand pointer-events-none absolute -right-1 -top-4 rounded-md bg-paper px-1.5 text-xl text-pink-deep"
              style={{ transform: `rotate(${i % 2 ? 5 : -4}deg)` }}
            >
              {stage.note}
            </span>
            {i < STAGES.length - 1 && (
              <span aria-hidden="true" className="absolute -right-3.5 top-1/2 z-10 hidden font-display text-2xl font-black text-ink lg:block">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
