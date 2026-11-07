/* Hand-built system diagram. Crisp at any size; scrolls horizontally inside its
   own container on small screens rather than shrinking into illegibility. */

const MONO = "var(--font-mono)";
const SANS = "var(--font-sans)";

function Node({ x, y, w, h, title, sub, accent = false, tag }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill="#0d0d10" stroke={accent ? "rgba(200,245,66,0.55)" : "rgba(255,255,255,0.13)"} />
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height="1" fill="rgba(255,255,255,0.05)" />
      {tag && (
        <text x={x + 16} y={y + 24} fill="#6e6e7a" fontFamily={MONO} fontSize="9.5" letterSpacing="1.4">
          {tag}
        </text>
      )}
      <text x={x + 16} y={y + (tag ? 46 : 34)} fill="#ededf0" fontFamily={SANS} fontSize="15" fontWeight="600" letterSpacing="-0.2">
        {title}
      </text>
      {sub.map((line, i) => (
        <text key={line} x={x + 16} y={y + (tag ? 66 : 54) + i * 16} fill="#a3a3ad" fontFamily={MONO} fontSize="10.5">
          {line}
        </text>
      ))}
    </g>
  );
}

function Flow({ d, label, lx, ly, color = "#c8f542", dashed = false, anchor = "middle" }) {
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={dashed ? 0.55 : 0.8}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "3 5" : "4 8"}
        strokeLinecap="round"
        style={{ animation: `dash ${dashed ? 2.4 : 1.2}s linear infinite` }}
      />
      {label && (
        <text x={lx} y={ly} fill="#6e6e7a" fontFamily={MONO} fontSize="9.5" textAnchor={anchor}>
          {label}
        </text>
      )}
    </g>
  );
}

export function Architecture() {
  return (
    <div className="panel overflow-hidden">
      <div className="scroll-thin overflow-x-auto">
        <svg viewBox="0 0 1000 480" className="block w-full min-w-[860px]" role="img" aria-labelledby="arch-title arch-desc">
          <title id="arch-title">Zenoryx system architecture</title>
          <desc id="arch-desc">
            The browser talks to a Next.js app that proxies /api to an Express API. The API process contains the HTTP layer and a
            durable ingestion runner; both use Postgres with pgvector. The runner fetches code from GitHub and calls a quota-aware pool of free Gemini and Groq models.
          </desc>
          <defs>
            <pattern id="arch-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>
          <rect width="1000" height="480" fill="url(#arch-dots)" />

          {/* API process boundary */}
          <rect x="262" y="34" width="300" height="300" rx="16" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="4 5" />
          <text x="278" y="56" fill="#6e6e7a" fontFamily={MONO} fontSize="9.5" letterSpacing="1.4">
            NODE PROCESS · RENDER
          </text>

          {/* Flows (drawn first, under nodes) */}
          <Flow d="M 202 228 C 240 228, 240 128, 280 128" label="same-origin /api" lx="236" ly="168" />
          <Flow d="M 540 116 C 600 116, 600 222, 660 222" label="stream answer" lx="600" ly="150" color="#5ee3ef" />
          <Flow d="M 540 268 C 600 268, 600 100, 660 100" label="tree · raw CDN" lx="616" ly="196" anchor="start" />
          <Flow d="M 540 290 C 610 290, 610 238, 660 238" label="embed · summarize" lx="604" ly="300" color="#5ee3ef" anchor="start" />
          <Flow d="M 810 262 L 810 318" label="429 → reroute" lx="822" ly="295" color="#ffb547" dashed anchor="start" />
          <Flow d="M 302 166 L 302 392" label="" />
          <Flow d="M 440 316 L 440 392" label="claim · upsert" lx="452" ly="362" anchor="start" />
          <text x="314" y="362" fill="#6e6e7a" fontFamily={MONO} fontSize="9.5">
            cosine &lt;=&gt;
          </text>

          {/* Nodes */}
          <Node x={20} y={178} w={182} h={100} tag="CLIENT" title="Next.js 15" sub={["App Router · React 19", "SSE reader · RQ cache"]} />
          <Node x={280} y={72} w={260} h={94} title="Express API" sub={["sessions · rate limits", "RAG + SSE streaming"]} accent />
          <Node x={330} y={222} w={210} h={94} title="Ingestion runner" sub={["durable · retries", "crash recovery on boot"]} />
          <Node x={262} y={392} w={300} h={72} title="Postgres + pgvector" sub={["vectors · sessions · job state"]} accent />
          <Node x={660} y={54} w={300} h={92} tag="EXTERNAL" title="GitHub" sub={["REST API (metadata, tree)", "raw CDN (file contents)"]} />
          <Node x={660} y={180} w={300} h={82} title="Gemini" sub={["embedding-001 · 3072-d", "Flash-Lite pool · Q&A"]} />
          <Node x={660} y={318} w={300} h={82} title="Groq" sub={["gpt-oss-120b · 20b · qwen", "token-bucket pool"]} />
        </svg>
      </div>
    </div>
  );
}
