import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: 'safe' | 'warning' | 'critical' | 'inactive' | 'offline';
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusBadgeProps['status'], { dot: string; text: string; bg: string; border: string }> = {
  safe: {
    dot: 'bg-green-500',
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  warning: {
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  critical: {
    dot: 'bg-red-500 animate-pulse',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  inactive: {
    dot: 'bg-slate-500',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
  offline: {
    dot: 'bg-gray-500',
    text: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = statusConfig[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase',
        cfg.bg,
        cfg.border,
        cfg.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
      )}
    >
      <span className={clsx('rounded-full', cfg.dot, size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      {status}
    </span>
  );
}
