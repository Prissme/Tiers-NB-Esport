'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export type EloDataPoint = {
  date: string;
  mmr: number;
};

type StatsGraphProps = {
  data: EloDataPoint[];
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
};

export default function StatsGraph({ data }: StatsGraphProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[12px] bg-slate-900/60 text-sm text-muted">
        Pas encore de données ELO sur 30 jours.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-[12px] bg-slate-900/60 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="rgba(148, 163, 184, 0.6)"
            fontSize={12}
          />
          <YAxis
            dataKey="mmr"
            stroke="rgba(148, 163, 184, 0.6)"
            fontSize={12}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderRadius: '10px',
              border: 'none',
              color: '#e2e8f0'
            }}
            labelFormatter={formatDate}
          />
          <Line
            type="monotone"
            dataKey="mmr"
            stroke="#38bdf8"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2, fill: '#38bdf8' }}
            fill="url(#eloGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
