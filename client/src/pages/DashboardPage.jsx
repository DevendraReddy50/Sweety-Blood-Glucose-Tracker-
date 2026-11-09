import React, { useState, useEffect, useCallback } from 'react';
import { readingsApi } from '../api/readingsApi';
import ReadingModal from '../components/ReadingModal';
import Pagination from '../components/Pagination';
import {
  Plus,
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
  Inbox,
  Filter,
} from 'lucide-react';

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

export default function DashboardPage() {
  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);

  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await readingsApi.getReadings({
        page,
        limit: 20,
        date: dateFilter || undefined,
      });
      setReadings(data.readings || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch blood glucose readings.');
    } finally {
      setLoading(false);
    }
  }, [page, dateFilter]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const handleOpenAddModal = () => {
    setSelectedReading(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (reading) => {
    setSelectedReading(reading);
    setIsModalOpen(true);
  };

  const handleDelete = async (reading) => {
    const confirmDelete = window.confirm(
      `Delete ${reading.slot} reading (${reading.value} mg/dl) on ${reading.date}?`
    );
    if (!confirmDelete) return;

    try {
      await readingsApi.deleteReading(reading.id);
      setSuccessMsg('Reading deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchReadings();
    } catch (err) {
      setError(err.message || 'Failed to delete reading.');
    }
  };

  const handleSaved = () => {
    setSuccessMsg(selectedReading ? 'Reading updated successfully.' : 'Reading logged successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
    fetchReadings();
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Blood Glucose Readings</h1>
          <p className="page-desc">Track and review your daily blood sugar entries</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Log Reading</span>
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              <Filter size={16} /> Filter by date:
            </span>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
            />
            {dateFilter && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDateFilter('');
                  setPage(1);
                }}
              >
                Clear Filter
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Allowed: 4 slots daily (Morning, Breakfast, Lunch, Dinner)
          </div>
        </div>
      </div>

      {/* Readings Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading readings...
          </div>
        ) : readings.length === 0 ? (
          <div className="empty-state">
            <Inbox className="empty-state-icon" />
            <h3 className="empty-state-title">No readings found</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {dateFilter
                ? `No readings recorded for ${dateFilter}.`
                : "You haven't logged any blood glucose readings yet."}
            </p>
            <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Log Your First Reading</span>
            </button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="readings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Glucose Level</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={15} color="#64748b" />
                          <span>{r.date}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: '500' }}>{r.slot}</td>
                      <td>
                        <strong style={{ fontSize: '1.05rem' }}>{r.value}</strong>{' '}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg/dl</span>
                      </td>
                      <td>
                        <span className={`badge ${getBadgeClass(r.value)}`}>
                          {getBadgeLabel(r.value)}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Reading"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="btn btn-danger-outline btn-sm"
                            title="Delete Reading"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
              <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
            </div>
          </>
        )}
      </div>

      <ReadingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        initialReading={selectedReading}
      />
    </div>
  );
}
