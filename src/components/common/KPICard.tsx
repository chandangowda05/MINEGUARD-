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

export default function KPICard({ title, value, icon, subtitle, trend, color = '#06b6d4' }: KPICardProps) {
  return (
    <div
      className="group rounded-lg border border-slate-700/50 p-4 transition-colors hover:border-slate-600"
      style={{ backgroundColor: '#1a1f2e' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#222839')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1a1f2e')}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20`, color }}
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
