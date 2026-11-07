"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

/** Small accessible confirm dialog (replaces window.confirm). */
export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", destructive = false, busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const latest = useRef({ onCancel, busy });
  latest.current = { onCancel, busy };

  // Focus once per opening (not on every parent re-render), trap Tab inside,
  // and hand focus back to whatever opened the dialog.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onCancel?.();
      if (e.key === "Tab") {
        const nodes = [...document.querySelectorAll("[role=alertdialog] button:not(:disabled)")];
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, [open]);

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
