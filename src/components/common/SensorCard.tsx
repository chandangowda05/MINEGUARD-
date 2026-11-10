import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface SensorCardProps {
  label: string;
  value: string | number | null;
  unit: string;
  status: 'normal' | 'warning' | 'critical' | 'unknown';
  icon: ReactNode;
  lastUpdated?: string | null;
  trend?: 'up' | 'down' | 'stable' | null;
}

const borderColors: Record<SensorCardProps['status'], string> = {
  normal: 'border-l-green-500',
  warning: 'border-l-amber-500',
  critical: 'border-l-red-500',
  unknown: 'border-l-slate-500',
};

const dotColors: Record<SensorCardProps['status'], string> = {
  normal: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500 animate-pulse',
  unknown: 'bg-slate-500',
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-400" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-400" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
};

export default function SensorCard({ label, value, unit, status, icon, lastUpdated, trend }: SensorCardProps) {
  return (
    <div
      className={clsx(
        'relative rounded-lg border border-slate-700/50 border-l-4 p-4',
        borderColors[status],
      )}
      style={{ backgroundColor: '#1a1f2e' }}
    >
      {/* Status dot */}
      <span className={clsx('absolute right-3 top-3 h-2.5 w-2.5 rounded-full', dotColors[status])} />

      {/* Header */}
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>

      {/* Value */}
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-100">{value ?? '--'}</span>
        <span className="mb-1 text-sm text-slate-500">{unit}</span>
        {trend && (
          <span className="mb-1 ml-auto">
            <TrendIcon trend={trend} />
          </span>
        )}
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <p className="mt-2 text-xs text-slate-600">
          Updated: {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
