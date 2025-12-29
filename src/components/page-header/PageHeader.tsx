import type { ReactNode } from "react";
import Chip from "../Chip";

type PageHeaderProps = {
  chipLabel: string;
  title: string;
  description: string;
  actionButton?: ReactNode;
  className?: string;
};

const PageHeader = ({
  chipLabel,
  title,
  description,
  actionButton,
  className = "",
}: PageHeaderProps) => {
  return (
    <header
      className={`flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-6 sm:p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between ${className}`}
    >
      <div className="space-y-3">
        <Chip label={chipLabel} />
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 hidden sm:block">{description}</p>
        </div>
      </div>
      {actionButton && (
        <div className="flex flex-col items-stretch gap-3 md:items-end">{actionButton}</div>
      )}
    </header>
  );
};

export default PageHeader;
