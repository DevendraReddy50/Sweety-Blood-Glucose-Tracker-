import React, { useState, useEffect } from 'react';
import { readingsApi } from '../api/readingsApi';
import { X, AlertCircle } from 'lucide-react';

const SLOTS = [
  'Morning (fasting)',
  'After breakfast',
  'After lunch',
  'After dinner',
];

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ReadingModal({ isOpen, onClose, onSaved, initialReading }) {
  const [date, setDate] = useState(getTodayString());
  const [slot, setSlot] = useState(SLOTS[0]);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!initialReading?.id;

  useEffect(() => {
    if (initialReading) {
      setDate(initialReading.date || getTodayString());
      setSlot(initialReading.slot || SLOTS[0]);
      setValue(initialReading.value !== undefined ? String(initialReading.value) : '');
    } else {
      setDate(getTodayString());
      setSlot(SLOTS[0]);
      setValue('');
    }
    setError('');
  }, [initialReading, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-flight validation aligned with server requirements
    if (value === '' || value === null || value === undefined) {
      setError('Please enter a glucose value.');
      return;
    }

    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num < 40 || num > 600) {
      setError('Value must be between 40 and 600 mg/dl.');
      return;
    }

    const todayStr = getTodayString();
    if (date > todayStr) {
      setError('Date cannot be in the future.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await readingsApi.updateReading(initialReading.id, {
          date,
          slot,
          value: num,
        });
      } else {
        await readingsApi.createReading({
          date,
          slot,
          value: num,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      // Show exact server error message
      setError(err.message || 'An error occurred while saving reading.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? 'Edit Glucose Reading' : 'Log Blood Glucose Reading'}
          </h2>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reading-date">Date</label>
            <input
              id="reading-date"
              type="date"
              className="form-input"
              value={date}
              max={getTodayString()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <div className="input-hint">Date cannot be in the future.</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reading-slot">Time Slot</label>
            <select
              id="reading-slot"
              className="form-select"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              required
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reading-value">Glucose Level (mg/dl)</label>
            <input
              id="reading-value"
              type="number"
              className="form-input"
              placeholder="e.g. 115"
              min="40"
              max="600"
              step="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
            <div className="input-hint">Whole number between 40 and 600 mg/dl.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Reading' : 'Save Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
