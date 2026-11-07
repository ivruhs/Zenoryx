/** Renders `backticked` spans inside plain text (e.g. AI-written summaries) as inline code. */
export function InlineCode({ text, className }) {
  if (!text) return null;
  const parts = String(text).split(/(`[^`\n]+`)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={i} className="rounded-[5px] border border-yellow/80 bg-yellow-soft px-1 py-px font-mono text-[0.86em] text-ink">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </span>
  );
}
