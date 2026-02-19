import type { ReactNode } from "react";
import { IoChevronUp, IoChevronDown } from "react-icons/io5";

export type SortOrder = "asc" | "desc";

type Column = {
  label: string;
  key?: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

export type DataTableProps = {
  columns: Column[];
  children: ReactNode;
  className?: string;
  sortBy?: string | null;
  sortOrder?: SortOrder;
  onSort?: (key: string) => void;
};

const DataTable = ({
  columns,
  children,
  className = "",
  sortBy = null,
  sortOrder = "asc",
  onSort,
}: DataTableProps) => {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 ${className} mb-4`}>
      <table className="min-w-full w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm ">
        <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          <tr>
            {columns.map((column) => {
              const alignClass =
                column.align === "right"
                  ? "text-right"
                  : column.align === "center"
                    ? "text-center"
                    : "text-left";
              const key = column.key ?? column.label;
              const isSorted = sortBy === key;
              const canSort = column.sortable && onSort;

              return (
                <th
                  key={key}
                  scope="col"
                  className={`px-6 py-4 font-semibold ${alignClass} ${
                    canSort
                      ? "cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                      : ""
                  }`}
                  onClick={() => canSort && onSort(key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.label}
                    {canSort && (
                      <span className="inline-flex text-slate-400 dark:text-slate-500">
                        {isSorted && sortOrder === "asc" ? (
                          <IoChevronUp className="w-4 h-4" />
                        ) : isSorted && sortOrder === "desc" ? (
                          <IoChevronDown className="w-4 h-4" />
                        ) : (
                          <IoChevronUp className="w-4 h-4 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950/40 text-slate-900 dark:text-slate-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
