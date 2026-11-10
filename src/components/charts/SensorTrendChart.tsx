import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import type { SensorReading } from '../../types';

interface SensorTrendChartProps {
  data: SensorReading[];
  dataKey: 'temperature' | 'humidity' | 'mq3_raw' | 'mq7_ppm' | 'mq7_raw';
  title: string;
  unit: string;
  strokeColor: string;
  fillColor: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  height?: number;
}

export default function SensorTrendChart({
  data,
  dataKey,
  title,
  unit,
  strokeColor,
  fillColor,
  warningThreshold,
  criticalThreshold,
  height = 240,
}: SensorTrendChartProps) {
  const chartData = data.map((d) => ({
    time: d.created_at ? format(new Date(d.created_at), 'HH:mm') : '',
    value: d[dataKey] ?? 0,
    fullDate: d.created_at,
  }));

  return (
    <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {title}
          </h3>
          <p className="text-xs text-slate-500">Telemetry Trend ({unit})</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {warningThreshold !== undefined && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              Warn: {warningThreshold}
            </span>
          )}
          {criticalThreshold !== undefined && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400"></span>
              Crit: {criticalThreshold}
            </span>
          )}
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#253047" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1f2e',
                borderColor: '#334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              formatter={(val) => [`${val ?? 0} ${unit}`, title]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad-${dataKey})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

