import type { ReactNode } from "react";

type Column = {
  label: string;
  key?: string;
  align?: "left" | "right" | "center";
};

type DataTableProps = {
  columns: Column[];
  children: ReactNode;
  className?: string;
};

const DataTable = ({ columns, children, className = "" }: DataTableProps) => {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-800 ${className} mb-4`}>
      <table className="min-w-full w-full divide-y divide-slate-800 text-left text-sm ">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.1em] text-slate-400">
          <tr>
            {columns.map((column) => {
              const alignClass = column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left";
              return (
                <th key={column.key || column.label} scope="col" className={`px-6 py-4 font-semibold ${alignClass}`}>
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
