import type { ReactElement } from "react";

type EmptyStateProps = {
  icon: ReactElement<{ className?: string }>;
  message: string;
  action?: ReactElement;
};

const EmptyState = ({ icon, message, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
      <div className="w-10 h-10 text-slate-400">{icon}</div>
      <p className="text-sm text-slate-400">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
