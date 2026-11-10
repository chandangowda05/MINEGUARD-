import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface ActivityHourPoint {
  hour: string;
  active: number;
  inactive: number;
  critical: number;
}

interface WorkerActivityTimelineProps {
  data?: ActivityHourPoint[];
  height?: number;
}

const DEFAULT_TIMELINE_DATA: ActivityHourPoint[] = [
  { hour: '06:00', active: 14, inactive: 1, critical: 0 },
  { hour: '08:00', active: 18, inactive: 2, critical: 0 },
  { hour: '10:00', active: 17, inactive: 3, critical: 1 },
  { hour: '12:00', active: 10, inactive: 10, critical: 0 },
  { hour: '14:00', active: 16, inactive: 3, critical: 2 },
  { hour: '16:00', active: 18, inactive: 2, critical: 0 },
  { hour: '18:00', active: 12, inactive: 6, critical: 0 },
  { hour: '20:00', active: 8, inactive: 2, critical: 0 },
];

export default function WorkerActivityTimeline({
  data = DEFAULT_TIMELINE_DATA,
  height = 240,
}: WorkerActivityTimelineProps) {
  return (
    <div className="navy-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Shift Activity & Presence
          </h3>
          <p className="text-xs text-slate-500">Worker state distribution by hour</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400"></span> Active
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span> Inactive
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-400"></span> Critical
          </span>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#253047" vertical={false} />
            <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1f2e',
                borderColor: '#334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="active" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="inactive" stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

