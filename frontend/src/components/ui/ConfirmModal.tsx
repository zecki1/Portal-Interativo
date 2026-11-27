import { useEffect } from "react";
import { IconAlert } from "../icons";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded bg-surface border border-border shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <IconAlert className={`w-5 h-5 shrink-0 mt-0.5 ${tone === "danger" ? "text-brand-red" : "text-brand-red"}`} />
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink">{title}</h3>
            <p className="text-sm text-muted mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded border border-border bg-surface text-ink text-sm font-semibold hover:bg-surface-2"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-white text-sm font-bold ${
              tone === "danger" ? "bg-brand-red hover:bg-brand-red-hover" : "bg-brand-red hover:bg-brand-red-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}