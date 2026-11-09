import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LayoutDashboard, BarChart3, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <NavLink to="/dashboard" className="nav-brand">
          <Activity size={24} />
          <span>Sweety</span>
        </NavLink>

        <div className="nav-links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 size={18} />
              <span>Reports</span>
            </div>
          </NavLink>

          <div className="user-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} color="#64748b" />
              <span className="user-name">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
