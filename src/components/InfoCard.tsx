import type { ReactNode } from "react";

interface InfoCardProps {
  label: string;
  value: ReactNode;
  description: string;
}

const InfoCard = ({ label, value, description }: InfoCardProps) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-500">{label}</p>
      <div className="mt-4">
        <span className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</span>
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
};

export default InfoCard;

