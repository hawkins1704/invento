import type { ReactNode } from "react";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!isOpen) {
    return null;
  }

  const confirmClasses =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 border border-red-600/60"
      : "bg-[#fa7316] text-white hover:bg-[#e86811] border border-[#fa7316]/60 ";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8 h-full">
      <div className="absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70" />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 text-slate-900 dark:text-white shadow-2xl shadow-black/60">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description && (
            <div className="text-sm text-slate-700 dark:text-slate-300">{description}</div>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white cursor-pointer"
              disabled={isConfirming}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${confirmClasses} cursor-pointer`}
            disabled={isConfirming}
          >
            {isConfirming ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

