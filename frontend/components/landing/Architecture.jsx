// Hand-assembled architecture diagram: printed boxes with off-register shadows,
// masking tape, and marching dashed flow lines on graph paper.

const DISPLAY = { fontFamily: "var(--font-display)" };
const MONO = { fontFamily: "var(--font-mono)" };

function Node({ x, y, w, h, title, sub, fill, shadow = "var(--color-ink)", tape = "var(--color-yellow)", tilt = 0 }) {
  const cx = x + w / 2;
  return (
    <g transform={`rotate(${tilt} ${cx} ${y + h / 2})`}>
      <rect x={x + 6} y={y + 6} width={w} height={h} rx="14" fill={shadow} />
      <rect x={x} y={y} width={w} height={h} rx="14" fill={fill} stroke="var(--color-ink)" strokeWidth="2.2" />
      <rect x={cx - 26} y={y - 8} width="52" height="15" fill={tape} opacity=".75" transform={`rotate(-4 ${cx} ${y})`} />
      <text x={x + 18} y={y + 38} fontSize="21" fontWeight="800" fill="var(--color-ink)" style={DISPLAY}>
        {title}
      </text>
      {sub.map((line, i) => (
        <text key={line} x={x + 18} y={y + 62 + i * 18} fontSize="12.5" fill="var(--color-ink-2)" style={MONO}>
          {line}
        </text>
      ))}
    </g>
  );
}

function Flow({ d, label, lx, ly, color = "var(--color-ink)", anchor = "middle" }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeDasharray="7 5"
        strokeLinecap="round"
        markerEnd="url(#arrow)"
        style={{ animation: "dash 1.1s linear infinite" }}
      />
      {label && (
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          fontSize="12"
          fill="var(--color-ink)"
          stroke="var(--color-paper-2)"
          strokeWidth="5"
          paintOrder="stroke"
          style={MONO}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function Architecture() {
  return (
    <div className="paper graph-paper relative overflow-hidden p-2 sm:p-4">
      <p className="hand absolute right-4 top-3 z-10 text-lg text-pink-deep sm:hidden" aria-hidden="true">
        scroll →
      </p>
      <div className="scroll-thin overflow-x-auto">
        <svg
          viewBox="0 0 960 560"
          className="h-auto w-full min-w-[760px]"
          role="img"
          aria-labelledby="arch-title arch-desc"
        >
          <title id="arch-title">Zenoryx architecture</title>
          <desc id="arch-desc">
            The Next.js frontend proxies /api to an Express API. The same Node process runs a durable ingestion runner.
            Both use Postgres with pgvector, which also stores the job queue. The runner reads code from GitHub and calls a
            quota-aware pool of free Gemini and Groq models.
          </desc>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {/* one Node process */}
          <rect x="300" y="52" width="300" height="324" rx="22" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeDasharray="10 7" />
          <g transform="rotate(-3 380 52)">
            <rect x="316" y="38" width="180" height="26" rx="4" fill="var(--color-yellow)" stroke="var(--color-ink)" strokeWidth="1.5" />
            <text x="406" y="56" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-ink)" style={MONO}>
              ONE NODE PROCESS
            </text>
          </g>

          <Node x={40} y={196} w={210} h={120} title="Next.js 15" sub={["App Router", "SSE reader · RQ cache"]} fill="var(--color-yellow-soft)" shadow="var(--color-blue)" tilt={-1.5} />
          <Node x={330} y={96} w={240} h={104} title="Express API" sub={["auth · rate limits", "RAG + SSE streaming"]} fill="var(--color-paper-2)" shadow="var(--color-pink)" />
          <Node x={330} y={246} w={240} h={104} title="Ingestion runner" sub={["durable · retries", "crash recovery on boot"]} fill="var(--color-pink-soft)" tape="var(--color-blue-soft)" />
          <Node x={330} y={434} w={240} h={100} title="Postgres + pgvector" sub={["vectors · sessions", "and the job queue"]} fill="var(--color-blue-soft)" shadow="var(--color-ink)" tilt={1} />
          <Node x={690} y={52} w={230} h={100} title="GitHub" sub={["REST: tree + metadata", "raw CDN: file contents"]} fill="var(--color-paper-2)" tilt={1.5} />
          <Node x={690} y={208} w={230} h={100} title="Gemini" sub={["embedding-001 · 3072-d", "Flash-Lite pool"]} fill="var(--color-green-soft)" tape="var(--color-pink)" />
          <Node x={690} y={364} w={230} h={100} title="Groq" sub={["gpt-oss-120b · 20b", "qwen3 · token buckets"]} fill="var(--color-orange-soft)" tilt={-1.2} />

          {/* model pool brace + note */}
          <path d="M934 214 q16 0 16 22 v190 q0 22 -16 22" fill="none" stroke="var(--color-pink-deep)" strokeWidth="2.4" strokeLinecap="round" />
          <text x="902" y="498" textAnchor="end" fontSize="24" fill="var(--color-pink-deep)" style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }} transform="rotate(-3 902 498)">
            7 free models, one gateway
          </text>

          <Flow d="M252 236 C 292 230, 296 140, 326 132" label="/api · same-origin" lx="292" ly="122" anchor="end" />
          <Flow d="M450 202 L 450 242" label="enqueue" lx="458" ly="226" anchor="start" />
          <Flow d="M330 178 C 266 222, 262 430, 326 482" label="cosine + identifiers" lx="256" ly="402" anchor="end" color="var(--color-blue)" />
          <Flow d="M450 352 L 450 428" label="upsert vectors" lx="458" ly="396" anchor="start" />
          <Flow d="M574 116 C 625 116, 642 100, 686 100" label="scan · validate" lx="630" ly="88" />
          <Flow d="M574 168 C 632 168, 648 236, 686 240" label="ask · stream" lx="596" ly="200" anchor="start" color="var(--color-pink-deep)" />
          <Flow d="M574 282 C 626 282, 650 266, 686 266" label="embed" lx="628" ly="300" />
          <Flow d="M574 324 C 628 324, 652 404, 686 410" label="annotate · history" lx="640" ly="384" />
        </svg>
      </div>
    </div>
  );
}
