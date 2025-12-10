import type { ReactNode } from "react";

type TableRowProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

const TableRow = ({ children, onClick, className = "" }: TableRowProps) => {
  const baseClasses = "transition hover:bg-slate-900/60 focus-visible:bg-slate-900/60";
  const clickableClasses = onClick ? "cursor-pointer" : "";

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      className={`${baseClasses} ${clickableClasses} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </tr>
  );
};

export default TableRow;
