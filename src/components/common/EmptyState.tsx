import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 text-center">
      <div className="text-slate-600">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
