import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import "react-day-picker/dist/style.css";

type DateRangePickerProps = {
    startDate: Date | null;
    endDate: Date | null;
    onRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    className?: string;
};

const DateRangePicker = ({
    startDate,
    endDate,
    onRangeChange,
    className = "",
}: DateRangePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
        () => {
            if (startDate && endDate) {
                return { from: startDate, to: endDate };
            }
            if (startDate) {
                return { from: startDate };
            }
            return undefined;
        }
    );
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const formatDate = (
        text: string,
        date: Date | null | undefined
    ): string => {
        if (!date) return `${text}`;
        return format(date, "dd/MM/yyyy");
    };

    const handleRangeSelect = (range: DateRange | undefined) => {
        setSelectedRange(range);
        if (range?.from && range?.to) {
            
            // Validar que el rango tenga al menos 1 día
            const start = new Date(range.from);
            start.setHours(0, 0, 0, 0);
            const end = new Date(range.to);
            end.setHours(0, 0, 0, 0);

            // Si las fechas son válidas (from <= to), actualizar
            if (start <= end) {
                onRangeChange({
                    from: range.from,
                    to: range.to,
                });
                //TODO: Si la fecha de inicio es igual a la fecha de fin, no cerrar el calendario
                setIsOpen(false);
            }
        } else if (range?.from) {
            // Primera fecha seleccionada, esperar la segunda
            onRangeChange({
                from: range.from,
                to: null,
            });
        } else {
            // Sin selección
            onRangeChange({
                from: null,
                to: null,
            });
        }
    };

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin del día de hoy

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex-1 rounded-lg border px-4 py-2 text-xs text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-[#fa7316]/30 ${
                        startDate
                            ? "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/60"
                            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/60"
                    } ${isOpen ? "border-[#fa7316] ring-2 ring-[#fa7316]/30" : ""}`}
                >
                    <div className="text-left">
                        <div className="font-semibold">
                            {formatDate("Desde", startDate)}
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex-1 rounded-lg border px-4 py-2 text-xs text-slate-900 dark:text-white outline-none transition focus:ring-2 focus:ring-[#fa7316]/30 ${
                        endDate
                            ? "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/60"
                            : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/60"
                    } ${isOpen ? "border-[#fa7316] ring-2 ring-[#fa7316]/30" : ""}`}
                >
                    <div className="text-left">
                        <div className="font-semibold">
                            {formatDate("Hasta", endDate)}
                        </div>
                    </div>
                </button>
            </div>
           

            {/* Calendario popup */}
            {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-xl">
                    <style>{`
                       
                        .rdp-day_range_start{
                            background-color: #FA7316 !important;
                            color: white !important;
                        }
                        .rdp-day_range_end {
                            background-color: #FA7316 !important;
                            color: white !important;
                        }
                        .rdp-day_range_middle {
                            background-color: rgba(250, 115, 22, 0.2) !important;
                            color: inherit !important;
                        }
                       
                        .rdp-today {
                            color:#FA7316 !important;
                            font-weight: 600;
                        }
                        .rdp-chevron{
                            fill:#FA7316 !important;
                        }
                        .rdp-day_selected {
                            color: white !important;
                        }
                     
                      
                    `}</style>
                    <DayPicker
                        mode="range"
                        selected={selectedRange}
                        onSelect={handleRangeSelect}
                        locale={es}
                        disabled={(date) => {
                            // Deshabilitar fechas futuras
                            return date > today;
                        }}
                        modifiersClassNames={{
                            selected: "rdp-day_selected",
                            range_start: "rdp-day_range_start",
                            range_end: "rdp-day_range_end",
                            range_middle: "rdp-day_range_middle",
                        }}
                        className="text-slate-900 dark:text-white"
                        classNames={{
                            day: "p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full",
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
