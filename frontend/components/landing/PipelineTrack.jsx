import { STAGES } from "@/lib/pipeline";

/** Tiny mono "readouts" that show what each stage actually produces. */
const READOUTS = {
  fetching: (
    <ul className="space-y-1">
      <li className="flex justify-between"><span className="truncate">src/server.ts</span><span className="text-signal">9.4</span></li>
      <li className="flex justify-between"><span className="truncate">lib/auth.ts</span><span className="text-signal">8.1</span></li>
      <li className="flex justify-between text-fg-faint line-through"><span className="truncate">test/a.spec.ts</span><span>−6</span></li>
    </ul>
  ),
  parsing: (
    <ul className="space-y-1">
      <li>program</li>
      <li className="pl-3 text-fg-muted">└ function_declaration</li>
      <li className="pl-3 text-fg-muted">└ class_declaration</li>
      <li className="pl-6 text-fg-faint">└ method_definition</li>
    </ul>
  ),
  summarizing: (
    <div className="space-y-1">
      <div className="text-fg-muted">{"{ \"files\": [{"}</div>
      <div className="truncate pl-3">&quot;summary&quot;: &quot;Verifies HMAC…&quot;</div>
      <div className="text-fg-muted">{"}] }"}</div>
    </div>
  ),
  embedding: (
    <div>
      <div className="grid grid-cols-12 gap-[2px]">
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="h-2 rounded-[1.5px]"
            style={{ background: `rgba(94,227,239,${0.15 + ((i * 37) % 11) / 13})` }}
          />
        ))}
      </div>
      <div className="mt-1.5 text-fg-faint">32 texts / request</div>
    </div>
  ),
  commits: (
    <ul className="space-y-1">
      <li><span className="text-amber">5317ebe</span> <span className="text-signal">+1</span> <span className="text-coral">−1</span></li>
      <li><span className="text-amber">ee714bd</span> <span className="text-signal">+3</span> <span className="text-coral">−3</span></li>
      <li className="truncate text-fg-faint">“Replaced app.del() with…”</li>
    </ul>
  ),
};

export function PipelineTrack() {
  return (
    <ol className="relative grid gap-px overflow-hidden rounded-2xl border hairline bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-5">
      {STAGES.map((s, i) => (
        <li key={s.id} className="group relative flex flex-col bg-ink-900 p-5 transition-colors hover:bg-ink-850">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-fg-faint">0{i + 1}</span>
            <span className="h-px flex-1 mx-3 bg-gradient-to-r from-[var(--line-strong)] to-transparent" />
            <span className="size-1.5 rounded-full bg-signal/70 transition-colors group-hover:bg-signal" />
          </div>
          <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{s.label}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{s.verb}.</p>
          <div className="mt-5 flex-1 rounded-lg border hairline bg-ink-950 p-3 font-mono text-[10.5px] leading-[1.6] text-fg-subtle">
            {READOUTS[s.id]}
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-fg-faint">{s.hint}</p>
        </li>
      ))}
    </ol>
  );
}
