import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Toast from "../components/Toast";
import type { ToastType } from "../components/Toast";

const DEFAULT_DURATION_MS = 5000;

type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({
    message: "",
    type: "info",
    visible: false,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info", durationMs = DEFAULT_DURATION_MS) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setState({ message, type, visible: true });
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, visible: false }));
        timeoutRef.current = null;
      }, durationMs);
    },
    []
  );

  const toast = useCallback(
    (message: string, type?: ToastType, durationMs?: number) => {
      show(message, type ?? "info", durationMs);
    },
    [show]
  );

  const success = useCallback(
    (message: string, durationMs?: number) => {
      show(message, "success", durationMs);
    },
    [show]
  );

  const error = useCallback(
    (message: string, durationMs?: number) => {
      show(message, "error", durationMs);
    },
    [show]
  );

  const info = useCallback(
    (message: string, durationMs?: number) => {
      show(message, "info", durationMs);
    },
    [show]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <Toast
        message={state.message}
        type={state.type}
        visible={state.visible}
        onClose={dismiss}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (value === null) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return value;
}
