import { cn } from "@/lib/format";

export function Spinner({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4 animate-spin", className)} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
