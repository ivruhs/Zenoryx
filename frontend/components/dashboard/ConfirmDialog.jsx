"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

/** Small accessible confirm dialog (replaces window.confirm). */
export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", destructive = false, busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !busy && onCancel?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  // Portal to <body>: transformed ancestors (tilted cards, animations) would
  // otherwise become the containing block for position:fixed and trap the overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/30 px-4 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!busy) onCancel?.();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className={`paper tape w-full max-w-sm animate-pop p-6 ${destructive ? "offset-pink tape-pink" : "offset-blue"}`}
        style={{ "--r": "-0.6deg", "--tape-r": "-4deg" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3.5">
          {destructive && (
            <span className="grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-pink text-ink shadow-[2px_2px_0_0_var(--color-ink)]">
              <AlertTriangle className="size-4" strokeWidth={2.5} />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-display text-lg font-extrabold leading-snug tracking-[-0.025em]">
              {title}
            </h2>
            {description && (
              <p id="confirm-desc" className="mt-1.5 text-sm leading-relaxed text-ink-2">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button ref={cancelRef} type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn btn-sm ${destructive ? "btn-pink" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="size-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
