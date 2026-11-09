import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../api/reportsApi';
import { readingsApi } from '../api/readingsApi';
import ReportCard from '../components/ReportCard';
import GlucoseChart from '../components/GlucoseChart';
import { Calendar, AlertCircle } from 'lucide-react';

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [reports, setReports] = useState(null);
  const [monthReadings, setMonthReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reportsApi.getReports(selectedDate);
      setReports(data);

      // Fetch readings for the month to feed the bonus Recharts chart
      if (data?.monthToDate?.startDate) {
        const monthRes = await readingsApi.getReadings({
          startDate: data.monthToDate.startDate,
          endDate: selectedDate,
          limit: 100,
        });
        setMonthReadings(monthRes.readings || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load glucose reports.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSetToday = () => {
    setSelectedDate(getTodayString());
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Glucose Analytics & Reports</h1>
          <p className="page-desc">Review your daily, month-to-date, and previous month statistics</p>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.4rem 0.75rem' }}>
            <Calendar size={18} color="#2563eb" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.925rem', fontWeight: '600', color: 'var(--text-main)', background: 'transparent' }}
            />
          </div>
          <button onClick={handleSetToday} className="btn btn-secondary btn-sm">Today</button>
          <button onClick={handleSetYesterday} className="btn btn-secondary btn-sm">Yesterday</button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Computing glucose report statistics...
        </div>
      ) : reports ? (
        <>
          <div className="reports-grid">
            {/* 1. Daily Report Card */}
            <ReportCard
              title="Daily Report"
              subtitle={`Selected Date: ${reports.daily.date}`}
              data={reports.daily}
              isDaily={true}
            />

            {/* 2. Month-to-Date (MTD) Report Card */}
            <ReportCard
              title="Month-to-Date (MTD)"
              subtitle={`${reports.monthToDate.startDate} to ${reports.monthToDate.endDate}`}
              data={reports.monthToDate}
            />

            {/* 3. Monthly (Previous Month) Report Card */}
            <ReportCard
              title="Previous Month"
              subtitle={`${reports.monthly.label} (${reports.monthly.startDate} to ${reports.monthly.endDate})`}
              data={reports.monthly}
            />
          </div>

          {/* Bonus Recharts Line Chart */}
          <GlucoseChart
            readings={monthReadings}
            title={`Month-to-Date Trend (${reports.monthToDate.startDate} to ${reports.monthToDate.endDate})`}
          />
        </>
      ) : null}
    </div>
  );
}
