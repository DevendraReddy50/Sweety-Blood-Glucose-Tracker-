import React from 'react';
import { TrendingUp, TrendingDown, Activity, Hash, Inbox } from 'lucide-react';

function getBadgeClass(val) {
  if (val < 70) return 'badge-low';
  if (val <= 140) return 'badge-normal';
  if (val <= 199) return 'badge-elevated';
  return 'badge-high';
}

function getBadgeLabel(val) {
  if (val < 70) return 'Low';
  if (val <= 140) return 'Normal';
  if (val <= 199) return 'Elevated';
  return 'High';
}

export default function ReportCard({ title, subtitle, data, isDaily = false }) {
  const hasData = data && data.count > 0;

  return (
    <div className="report-card">
      <div className="report-card-header">
        <div>
          <h3 className="report-card-title">{title}</h3>
          {subtitle && <div className="report-card-subtitle">{subtitle}</div>}
        </div>
        {hasData && (
          <span className="badge badge-normal">
            {data.count} {data.count === 1 ? 'Reading' : 'Readings'}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="empty-state">
          <Inbox className="empty-state-icon" />
          <h4 className="empty-state-title">No readings available</h4>
          <p style={{ fontSize: '0.875rem' }}>
            There are no glucose readings recorded for this period.
          </p>
        </div>
      ) : (
        <>
          <div className="report-stats-grid">
            <div className="stat-item">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Activity size={14} color="#2563eb" />
                <span>Average</span>
              </div>
              <div className="stat-value">
                {data.average}
                <span className="stat-unit">mg/dl</span>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TrendingUp size={14} color="#ef4444" />
                <span>Highest</span>
              </div>
              <div className="stat-value">
                {data.highest}
                <span className="stat-unit">mg/dl</span>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TrendingDown size={14} color="#10b981" />
                <span>Lowest</span>
              </div>
              <div className="stat-value">
                {data.lowest}
                <span className="stat-unit">mg/dl</span>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Hash size={14} color="#64748b" />
                <span>Count</span>
              </div>
              <div className="stat-value">
                {data.count}
              </div>
            </div>
          </div>

          {isDaily && data.readings && data.readings.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Day's Slot Readings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.readings.map((reading) => (
                  <div
                    key={reading.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    <span className="slot-badge">{reading.slot}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                        {reading.value} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>mg/dl</span>
                      </span>
                      <span className={`badge ${getBadgeClass(reading.value)}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>
                        {getBadgeLabel(reading.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
