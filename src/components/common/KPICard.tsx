import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  color?: string;
}

export default function KPICard({ title, value, icon, subtitle, trend, color = '#3b82f6' }: KPICardProps) {
  return (
    <div className="navy-card p-4 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend.direction === 'up' ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className={trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}>
            {trend.value}%
          </span>
          <span className="text-slate-500">vs last shift</span>
        </div>
      )}
    </div>
  );
}
