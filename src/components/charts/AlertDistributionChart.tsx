import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { Alert } from '../../types';
import { ALERT_TYPE_LABELS } from '../../types';

interface AlertDistributionChartProps {
  alerts: Alert[];
  height?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  EMERGENCY_SOS: '#ef4444',
  RESTRICTED_ZONE_ENTRY: '#f97316',
  SAFE_ZONE_EXIT: '#f59e0b',
  HAZARDOUS_GAS: '#eab308',
  CARBON_MONOXIDE: '#ec4899',
  HIGH_TEMPERATURE: '#f43f5e',
  HIGH_HUMIDITY: '#06b6d4',
  POSSIBLE_FALL: '#8b5cf6',
  WORKER_INACTIVITY: '#6366f1',
  SUDDEN_IMPACT: '#d946ef',
  HELMET_OFFLINE: '#64748b',
  GPS_SIGNAL_LOST: '#475569',
};

export default function AlertDistributionChart({ alerts, height = 260 }: AlertDistributionChartProps) {
  // Aggregate count by alert category
  const countMap: Record<string, number> = {};
  alerts.forEach((a) => {
    countMap[a.alert_type] = (countMap[a.alert_type] || 0) + 1;
  });

  const data = Object.entries(countMap).map(([type, count]) => ({
    type,
    label: ALERT_TYPE_LABELS[type as keyof typeof ALERT_TYPE_LABELS] || type,
    count,
    color: CATEGORY_COLORS[type] || '#06b6d4',
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Alert Frequency by Category
        </h3>
        <p className="text-xs text-slate-500">Hazard and system event distribution</p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-slate-500">
          No alert incidents logged.
        </div>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#253047" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                width={120}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1f2e',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                formatter={(val) => [`${val ?? 0} incidents`, 'Count']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
