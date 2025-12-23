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
      ? "bg-red-500 text-white hover:bg-red-400 border border-red-500/60"
      : "bg-[#fa7316] text-white hover:bg-[#e86811] border border-[#fa7316]/60 ";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur" />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-slate-800 bg-slate-900/90 p-6 text-white shadow-2xl shadow-black/60">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && (
            <div className="text-sm text-slate-300">{description}</div>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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

