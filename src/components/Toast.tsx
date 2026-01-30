import { useLayoutEffect, useEffect, useState, type ReactNode } from "react";
import {
  IoCheckmarkCircle,
  IoWarning,
  IoInformationCircle,
  IoClose,
} from "react-icons/io5";

export type ToastType = "success" | "error" | "info";

const TOAST_ANIMATION_MS = 250;

type ToastProps = {
  message: string;
  type: ToastType;
  visible: boolean;
  onClose: () => void;
};

const typeConfig: Record<
  ToastType,
  { icon: ReactNode; className: string }
> = {
  success: {
    icon: <IoCheckmarkCircle className="h-5 w-5 flex-shrink-0" />,
    className:
      "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/30 dark:bg-emerald-700 dark:border-emerald-800",
  },
  error: {
    icon: <IoWarning className="h-5 w-5 flex-shrink-0" />,
    className:
      "bg-red-600 text-white border-red-700 shadow-red-900/30 dark:bg-red-700 dark:border-red-800",
  },
  info: {
    icon: <IoInformationCircle className="h-5 w-5 flex-shrink-0" />,
    className:
      "bg-slate-700 text-white border-slate-800 shadow-slate-900/30 dark:bg-slate-600 dark:border-slate-700",
  },
};

const Toast = ({ message, type, visible, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (visible) setIsExiting(false);
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) setIsExiting(true);
  }, [visible]);

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(() => setIsExiting(false), TOAST_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [isExiting]);

  const show = visible || isExiting;
  if (!show) return null;

  const { icon, className } = typeConfig[type];

  return (
    <div
      className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
      role="alert"
    >
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-4 pr-4 shadow-lg ${className} ${
          isExiting ? "animate-toast-out" : "animate-toast-in"
        }`}
      >
        {icon}
        <p className="text-sm font-medium min-w-0">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white/90 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Cerrar"
        >
          <IoClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
