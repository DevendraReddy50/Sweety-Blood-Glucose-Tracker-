import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export default function GlucoseChart({ readings, title = 'Monthly Glucose Trend' }) {
  if (!readings || readings.length === 0) {
    return null;
  }

  // Sort readings chronologically for charting
  const chartData = [...readings]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => ({
      date: r.date.slice(5), // MM-DD
      fullDate: r.date,
      value: r.value,
      slot: r.slot,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.6rem 0.85rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
            {data.fullDate} ({data.slot})
          </div>
          <div style={{ color: '#2563eb', fontWeight: '800', fontSize: '1.1rem', marginTop: '0.2rem' }}>
            {data.value} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>mg/dl</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>{title}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Blood glucose readings across the selected period
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            Target (70–140)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, background: '#2563eb', borderRadius: '50%', display: 'inline-block' }} />
            Readings
          </span>
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} domain={[40, 'auto']} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={140} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target max (140)', position: 'insideTopRight', fill: '#10b981', fontSize: 10 }} />
            <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Low (70)', position: 'insideBottomRight', fill: '#f59e0b', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
