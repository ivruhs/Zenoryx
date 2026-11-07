"use client";

import { useEffect, useRef } from "react";
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4 backdrop-blur-[2px] animate-fade-in"
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
        className="panel-raised w-full max-w-sm animate-fade-up p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3.5">
          {destructive && (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-coral/25 bg-coral/10 text-coral">
              <AlertTriangle className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            {description && (
              <p id="confirm-desc" className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn btn-sm ${destructive ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="size-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
