import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

interface CodePinInputProps {
  label: string;
  name: string;
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  focusOnMount?: boolean;
  className?: string;
}

const DEFAULT_LENGTH = 4;

export function CodePinInput({
  label,
  name,
  length = DEFAULT_LENGTH,
  value,
  onChange,
  focusOnMount,
  className = "",
}: CodePinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const safeLength = useMemo(() => Math.max(1, length), [length]);

  useEffect(() => {
    if (focusOnMount) {
      inputsRef.current[0]?.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    if (value.length !== safeLength) {
      onChange(Array(safeLength).fill(""));
    }
  }, [onChange, safeLength, value]);

  const handleChange = useCallback(
    (index: number, newValue: string) => {
      if (!/^[0-9]?$/.test(newValue)) {
        return;
      }

      const digits = [...value];
      digits[index] = newValue;
      onChange(digits);

      if (newValue && index < safeLength - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [onChange, value, safeLength]
  );

  const handleKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !value[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    },
    [value]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pasted = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, safeLength);

      if (!pasted) {
        return;
      }

      const digits = Array(safeLength)
        .fill("")
        .map((_, index) => pasted[index] ?? "");
      onChange(digits);

      const focusIndex = Math.min(pasted.length, safeLength - 1);
      inputsRef.current[focusIndex]?.focus();
    },
    [onChange, safeLength]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        htmlFor={`${name}-digit-0`}
      >
        {label}
      </label>
      <div className="flex items-center gap-3">
        {value.map((digit, index) => (
          <input
            key={`${name}-digit-${index}`}
            id={`${name}-digit-${index}`}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value.slice(-1))}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className="h-12 w-12 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        ))}
      </div>
      <input type="hidden" name={name} value={value.join("")} />
    </div>
  );
}

export default CodePinInput;

