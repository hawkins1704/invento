import type { ReactNode } from "react";
import { formatDate as formatDateUtil } from "../../utils/format";

type SalesPageHeaderProps = {
    title: string;
    date?: string | number | Date;
    chip?: string;
    actions?: ReactNode;
    className?: string;
};

const SalesPageHeader = ({
    title,
    date,
    chip,
    actions,
    className = "",
}: SalesPageHeaderProps) => {
    const formatDateDisplay = (dateValue: string | number | Date): string => {
        if (typeof dateValue === "string") {
            return dateValue;
        }
        // Si es number (timestamp) o Date, usar la función formatDate existente
        const timestamp = typeof dateValue === "number" ? dateValue : dateValue.getTime();
        return formatDateUtil(timestamp);
    };

    return (
        <header
            className={`flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-white shadow-inner shadow-black/20 ${
                actions ? "lg:flex-row lg:items-center lg:justify-between" : ""
            } ${className}`}
        >
            <div className="space-y-3">
                {chip && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                        {chip}
                    </div>
                )}
                <div className="space-y-2">
                    <h1 className={`text-xl sm:text-3xl font-semibold ${chip ? "mt-3" : ""}`}>
                        {title}
                    </h1>
                    {date && (
                        <div className="text-xs uppercase tracking-[0.1em] text-slate-400">
                            {formatDateDisplay(date)}
                        </div>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex flex-col items-stretch gap-3 lg:items-end">
                    {actions}
                </div>
            )}
        </header>
    );
};

export default SalesPageHeader;

